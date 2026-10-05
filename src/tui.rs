use crate::core::{Comment, DiffKind, DiffRow, Session, Side, Snapshot, line_range, lines};
use anyhow::{Context, Result, ensure};
use crossterm::{
    event::{
        self, DisableBracketedPaste, EnableBracketedPaste, Event, KeyCode, KeyEvent, KeyEventKind,
        KeyModifiers,
    },
    execute,
};
use ratatui::{
    Frame,
    layout::{Constraint, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph},
};
use std::{
    io,
    time::{Duration, Instant},
};

#[derive(Clone)]
struct Row {
    text: String,
    /// `None` for source lines and messages.
    kind: Option<DiffKind>,
    target: Option<(String, usize)>,
}
fn note(text: impl Into<String>) -> Row {
    Row {
        text: text.into(),
        kind: None,
        target: None,
    }
}
#[derive(Clone, Copy, PartialEq)]
enum Mode {
    /// The unified diff of a diff file, or the source of a source file.
    Main,
    /// The full text of one snapshot.
    Snapshot(Side),
    /// The current disk content compared with the reviewed snapshot (read-only).
    Disk,
}
#[derive(Clone, Copy)]
enum Confirm {
    Quit,
    Delete,
}
struct Draft {
    text: String,
    cursor: usize,
    edit: Option<String>,
    target: Option<(String, usize, usize)>,
}
struct Ui {
    session: Session,
    file: usize,
    mode: Mode,
    /// Diff context lines target the old side instead of the new side.
    old: bool,
    rows: Vec<Row>,
    line: usize,
    anchor: Option<usize>,
    comment: usize,
    comments_focus: bool,
    horizontal: usize,
    draft: Option<Draft>,
    confirm: Option<Confirm>,
    message: String,
}
struct Restore;
impl Drop for Restore {
    fn drop(&mut self) {
        let _ = execute!(io::stdout(), DisableBracketedPaste);
        ratatui::restore();
    }
}

fn clean(text: &str) -> String {
    text.chars()
        .map(|c| {
            if c == '\t' {
                ' '
            } else if c.is_control() {
                '�'
            } else {
                c
            }
        })
        .collect()
}
impl Ui {
    fn rebuild(&mut self) {
        let f = &self.session.feedback.files[self.file];
        let from_diff = |diff: &[DiffRow], targets: bool| {
            diff.iter()
                .map(|row| {
                    let side = if row.kind == DiffKind::Delete
                        || (row.kind == DiffKind::Context && self.old)
                    {
                        Side::Old
                    } else {
                        Side::New
                    };
                    let number = if side == Side::Old {
                        row.old_line
                    } else {
                        row.new_line
                    };
                    let target = if targets {
                        f.snapshot(side)
                            .and_then(|s| number.map(|n| (s.id.clone(), n)))
                    } else {
                        None
                    };
                    let marker = match row.kind {
                        DiffKind::Add => '+',
                        DiffKind::Delete => '-',
                        DiffKind::Context => ' ',
                        _ => '·',
                    };
                    Row {
                        text: format!(
                            "{:>5} {:>5} {marker} {}",
                            row.old_line.map(|n| n.to_string()).unwrap_or_default(),
                            row.new_line.map(|n| n.to_string()).unwrap_or_default(),
                            row.text
                        ),
                        kind: Some(row.kind),
                        target,
                    }
                })
                .collect::<Vec<_>>()
        };
        let source = |s: Option<&Snapshot>| {
            s.map(|s| {
                lines(&s.text)
                    .iter()
                    .enumerate()
                    .map(|(i, (a, b))| Row {
                        text: format!("{:>5} {}", i + 1, s.text[*a..*b].trim_end_matches('\n')),
                        kind: None,
                        target: Some((s.id.clone(), i + 1)),
                    })
                    .collect()
            })
            .unwrap_or_default()
        };
        self.rows = match self.mode {
            Mode::Disk => {
                let disk = &self.session.disk[self.file];
                if disk.diff.is_empty() {
                    vec![note(disk.message.clone())]
                } else {
                    from_diff(&disk.diff, false)
                }
            }
            Mode::Main if f.is_diff() => from_diff(&self.session.diffs[self.file], true),
            Mode::Main => source(f.snapshots.first()),
            Mode::Snapshot(side) => source(f.snapshot(side)),
        };
        if self.rows.is_empty() {
            self.rows.push(note("No textual changes on this side."));
        }
        self.line = self.line.min(self.rows.len() - 1);
    }
    fn selected_target(&self) -> Result<(String, usize, usize)> {
        let a = self.anchor.unwrap_or(self.line).min(self.line);
        let b = self.anchor.unwrap_or(self.line).max(self.line);
        let (snapshot, start) = self.rows[a]
            .target
            .as_ref()
            .context("Select source content; revisions are read-only")?;
        let (_, end) = self.rows[b]
            .target
            .as_ref()
            .context("End selection on source content")?;
        ensure!(
            self.rows[a..=b]
                .iter()
                .filter_map(|r| r.target.as_ref())
                .all(|(id, _)| id == snapshot),
            "Select a single diff side; use b for the full old/new source"
        );
        let s = self.session.feedback.files[self.file]
            .snapshots
            .iter()
            .find(|s| &s.id == snapshot)
            .unwrap();
        let (start, end) = line_range(&s.text, *start, *end)?;
        Ok((snapshot.clone(), start, end))
    }
    fn revisit(&mut self, c: &Comment) {
        self.file = self
            .session
            .feedback
            .files
            .iter()
            .position(|f| f.id == c.target.file_id)
            .unwrap();
        self.mode = Mode::Snapshot(c.target.side);
        self.anchor = None;
        self.line = c.target.start_line - 1;
        self.rebuild();
        self.message = format!(
            "Original {:?} L{}–{}: {}",
            c.target.side, c.target.start_line, c.target.end_line, c.body
        );
    }
    fn key(&mut self, key: KeyEvent) -> Result<bool> {
        if self.draft.is_some() {
            if key.code == KeyCode::Esc {
                self.draft = None;
                self.message = "Draft cancelled".into();
                return Ok(false);
            }
            if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('s') {
                let draft = self.draft.as_ref().unwrap();
                if let Some(id) = &draft.edit {
                    self.session.edit(id, draft.text.clone())?;
                } else {
                    let (snap, a, b) = draft.target.as_ref().unwrap();
                    let file = self.session.feedback.files[self.file].id.clone();
                    self.session.add(&file, snap, *a, *b, draft.text.clone())?;
                }
                self.draft = None;
                self.anchor = None;
                self.message = "Comment recorded; s saves feedback to disk".into();
                return Ok(false);
            }
            edit_input(self.draft.as_mut().unwrap(), key);
            return Ok(false);
        }
        if let Some(action) = self.confirm {
            match (action, key.code) {
                (Confirm::Quit, KeyCode::Char('s')) => {
                    let p = self.session.save()?;
                    self.message = format!("Saved {}", p.display());
                    return Ok(true);
                }
                (Confirm::Quit, KeyCode::Char('d')) => return Ok(true),
                (Confirm::Delete, KeyCode::Char('y')) => {
                    if let Some(c) = self.session.feedback.comments.get(self.comment) {
                        let id = c.id.clone();
                        self.session.delete(&id)?;
                    }
                    self.comment = self
                        .comment
                        .min(self.session.feedback.comments.len().saturating_sub(1));
                    self.confirm = None;
                }
                (_, KeyCode::Esc | KeyCode::Char('n')) => self.confirm = None,
                _ => {}
            }
            return Ok(false);
        }
        if key.code == KeyCode::Char('q')
            || (key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c'))
        {
            if self.session.dirty {
                self.confirm = Some(Confirm::Quit);
            } else {
                return Ok(true);
            }
            return Ok(false);
        }
        let count = if self.comments_focus {
            self.session.feedback.comments.len()
        } else {
            self.rows.len()
        };
        let cursor = if self.comments_focus {
            &mut self.comment
        } else {
            &mut self.line
        };
        match key.code {
            KeyCode::Down | KeyCode::Char('j') => {
                *cursor = (*cursor + 1).min(count.saturating_sub(1))
            }
            KeyCode::Up | KeyCode::Char('k') => *cursor = cursor.saturating_sub(1),
            KeyCode::PageDown => *cursor = (*cursor + 12).min(count.saturating_sub(1)),
            KeyCode::PageUp => *cursor = cursor.saturating_sub(12),
            KeyCode::Home | KeyCode::Char('g') => *cursor = 0,
            KeyCode::End | KeyCode::Char('G') => *cursor = count.saturating_sub(1),
            KeyCode::Tab => self.comments_focus = !self.comments_focus,
            KeyCode::Left | KeyCode::Char('h') => {
                self.horizontal = self.horizontal.saturating_sub(8)
            }
            KeyCode::Right | KeyCode::Char('l') => self.horizontal += 8,
            KeyCode::Char(']') | KeyCode::Char('[') => {
                let len = self.session.feedback.files.len();
                self.file = if key.code == KeyCode::Char(']') {
                    (self.file + 1) % len
                } else {
                    (self.file + len - 1) % len
                };
                self.mode = Mode::Main;
                self.line = 0;
                self.anchor = None;
                self.horizontal = 0;
                self.rebuild();
            }
            KeyCode::Char('v') if !self.comments_focus => {
                self.anchor = if self.anchor.is_some() {
                    None
                } else {
                    Some(self.line)
                };
            }
            KeyCode::Char('o') => {
                self.old = true;
                self.rebuild();
            }
            KeyCode::Char('n') => {
                self.old = false;
                self.rebuild();
            }
            KeyCode::Char('b') => {
                self.mode = match self.mode {
                    _ if !self.session.feedback.files[self.file].is_diff() => Mode::Main,
                    Mode::Main => Mode::Snapshot(Side::Old),
                    Mode::Snapshot(Side::Old) => Mode::Snapshot(Side::New),
                    _ => Mode::Main,
                };
                self.line = 0;
                self.anchor = None;
                self.rebuild();
            }
            KeyCode::Char('r') => {
                self.session.refresh();
                self.mode = if self.mode == Mode::Disk {
                    Mode::Main
                } else {
                    Mode::Disk
                };
                self.line = 0;
                self.anchor = None;
                self.rebuild();
            }
            KeyCode::Char('c') if !self.comments_focus => {
                let target = self.selected_target()?;
                self.draft = Some(Draft {
                    text: String::new(),
                    cursor: 0,
                    edit: None,
                    target: Some(target),
                });
            }
            KeyCode::Enter | KeyCode::Char('e') if self.comments_focus => {
                if let Some(c) = self.session.feedback.comments.get(self.comment).cloned() {
                    self.revisit(&c);
                    if key.code == KeyCode::Char('e') {
                        self.draft = Some(Draft {
                            cursor: c.body.len(),
                            text: c.body,
                            edit: Some(c.id),
                            target: None,
                        });
                    }
                }
            }
            KeyCode::Char('d')
                if self.comments_focus && !self.session.feedback.comments.is_empty() =>
            {
                self.confirm = Some(Confirm::Delete)
            }
            KeyCode::Char('s') => {
                let path = self.session.save()?;
                self.message = format!("Saved {}", path.display());
            }
            KeyCode::Esc => self.anchor = None,
            _ => {}
        }
        Ok(false)
    }
}

fn edit_input(d: &mut Draft, key: KeyEvent) {
    let left = || {
        d.text[..d.cursor]
            .char_indices()
            .next_back()
            .map(|(i, _)| i)
            .unwrap_or(0)
    };
    let right = || {
        d.text[d.cursor..]
            .chars()
            .next()
            .map(|c| d.cursor + c.len_utf8())
            .unwrap_or(d.cursor)
    };
    match key.code {
        KeyCode::Left => d.cursor = left(),
        KeyCode::Right => d.cursor = right(),
        KeyCode::Home => d.cursor = d.text[..d.cursor].rfind('\n').map(|i| i + 1).unwrap_or(0),
        KeyCode::End => {
            d.cursor = d.text[d.cursor..]
                .find('\n')
                .map(|i| d.cursor + i)
                .unwrap_or(d.text.len())
        }
        KeyCode::Up | KeyCode::Down => {
            let start = d.text[..d.cursor].rfind('\n').map(|i| i + 1).unwrap_or(0);
            let col = d.text[start..d.cursor].chars().count();
            let other = if key.code == KeyCode::Up {
                if start == 0 {
                    0
                } else {
                    d.text[..start - 1].rfind('\n').map(|i| i + 1).unwrap_or(0)
                }
            } else {
                d.text[d.cursor..]
                    .find('\n')
                    .map(|i| d.cursor + i + 1)
                    .unwrap_or(start)
            };
            let end = d.text[other..]
                .find('\n')
                .map(|i| other + i)
                .unwrap_or(d.text.len());
            d.cursor = d.text[other..end]
                .char_indices()
                .nth(col)
                .map(|(i, _)| other + i)
                .unwrap_or(end);
        }
        KeyCode::Backspace if d.cursor > 0 => {
            let p = left();
            d.text.replace_range(p..d.cursor, "");
            d.cursor = p;
        }
        KeyCode::Delete => {
            let p = right();
            d.text.replace_range(d.cursor..p, "");
        }
        KeyCode::Enter => {
            d.text.insert(d.cursor, '\n');
            d.cursor += 1;
        }
        KeyCode::Char(c)
            if !key
                .modifiers
                .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT) =>
        {
            d.text.insert(d.cursor, c);
            d.cursor += c.len_utf8();
        }
        _ => {}
    }
}

fn render(frame: &mut Frame, ui: &Ui) {
    let height = if ui.draft.is_some() { 8 } else { 3 };
    let areas = Layout::vertical([
        Constraint::Length(3),
        Constraint::Min(3),
        Constraint::Length(height),
    ])
    .split(frame.area());
    let file = &ui.session.feedback.files[ui.file];
    let disk = &ui.session.disk[ui.file];
    let mode = match ui.mode {
        Mode::Main if file.is_diff() => "unified diff",
        Mode::Main | Mode::Snapshot(Side::Source) => "reviewed source",
        Mode::Snapshot(Side::Old) => "old source",
        Mode::Snapshot(Side::New) => "new source",
        Mode::Disk => "disk revision (read-only)",
    };
    frame.render_widget(
        Paragraph::new(vec![
            Line::from(format!(
                "Review · {} · {}/{} · {mode} · {:?}",
                clean(&file.path),
                ui.file + 1,
                ui.session.feedback.files.len(),
                disk.status
            )),
            Line::from(format!(
                "Save: {}{}",
                clean(&ui.session.output.display().to_string()),
                if ui.session.dirty {
                    " · unsaved"
                } else {
                    " · saved"
                }
            )),
        ]),
        areas[0],
    );
    let panes = Layout::horizontal([Constraint::Percentage(68), Constraint::Percentage(32)])
        .split(areas[1]);
    let a = ui.anchor.unwrap_or(ui.line).min(ui.line);
    let b = ui.anchor.unwrap_or(ui.line).max(ui.line);
    let rows = ui
        .rows
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let color = match r.kind {
                Some(DiffKind::Add) => Color::Green,
                Some(DiffKind::Delete) => Color::Red,
                Some(DiffKind::Hunk) => Color::Cyan,
                _ => Color::Reset,
            };
            let style = if i >= a && i <= b && ui.anchor.is_some() {
                Style::default().bg(Color::DarkGray)
            } else {
                Style::default()
            };
            ListItem::new(Line::from(Span::styled(
                clean(&r.text)
                    .chars()
                    .skip(ui.horizontal)
                    .collect::<String>(),
                Style::default().fg(color),
            )))
            .style(style)
        })
        .collect::<Vec<_>>();
    let list = List::new(rows)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(if ui.comments_focus {
                    "Content"
                } else {
                    "Content · v select · c comment"
                }),
        )
        .highlight_style(Style::default().add_modifier(Modifier::REVERSED));
    let mut selected = ListState::default().with_selected(Some(ui.line));
    frame.render_stateful_widget(list, panes[0], &mut selected);
    let comments = ui.session.feedback.comments.iter().map(|c| {
        ListItem::new(vec![
            Line::from(format!(
                "{} {:?} L{}–{}",
                clean(&c.target.path),
                c.target.side,
                c.target.start_line,
                c.target.end_line
            )),
            Line::from(clean(&c.body.replace('\n', " ↵ "))),
        ])
    });
    let list = List::new(comments)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Comments · Tab · Enter revisit · e edit · d delete"),
        )
        .highlight_style(Style::default().bg(if ui.comments_focus {
            Color::Blue
        } else {
            Color::DarkGray
        }));
    let mut selected =
        ListState::default().with_selected(if ui.session.feedback.comments.is_empty() {
            None
        } else {
            Some(ui.comment)
        });
    frame.render_stateful_widget(list, panes[1], &mut selected);
    if let Some(d) = &ui.draft {
        let input_areas =
            Layout::vertical([Constraint::Length(1), Constraint::Min(1)]).split(areas[2]);
        frame.render_widget(Paragraph::new(clean(&ui.message)), input_areas[0]);
        let block = Block::default()
            .borders(Borders::ALL)
            .title("Comment · Ctrl+S record · Enter newline · Esc cancel");
        let inner = block.inner(input_areas[1]);
        frame.render_widget(block, input_areas[1]);
        let row = d.text[..d.cursor].bytes().filter(|b| *b == b'\n').count();
        let prefix = d.text[..d.cursor].rsplit('\n').next().unwrap_or("");
        let col = Line::from(clean(prefix)).width();
        let scroll = row.saturating_sub(inner.height.saturating_sub(1) as usize);
        let horizontal = col.saturating_sub(inner.width.saturating_sub(1) as usize);
        let text = d
            .text
            .split('\n')
            .skip(scroll)
            .map(|l| Line::from(clean(l).chars().skip(horizontal).collect::<String>()))
            .collect::<Vec<_>>();
        frame.render_widget(Paragraph::new(text), inner);
        if inner.width > 0 && inner.height > 0 {
            frame.set_cursor_position((
                inner.x + (col - horizontal) as u16,
                inner.y + (row - scroll) as u16,
            ));
        }
    } else {
        let message = match ui.confirm {
            Some(Confirm::Quit) => "Unsaved feedback. s save and quit · d discard · Esc cancel",
            Some(Confirm::Delete) => "Delete this comment? y delete · Esc cancel",
            None => &ui.message,
        };
        let keys = "j/k move · PgUp/PgDn · h/l scroll · [/] files · b sides · o/n diff target · r revisions · s save · q quit";
        frame.render_widget(
            Paragraph::new(vec![
                Line::from(clean(message)),
                Line::from(keys),
                Line::from(clean(&disk.message)),
            ]),
            areas[2],
        );
    }
}

pub fn run(session: Session) -> Result<()> {
    let mut terminal = ratatui::try_init()?;
    let _restore = Restore;
    execute!(io::stdout(), EnableBracketedPaste)?;
    let mut ui = Ui {
        session,
        file: 0,
        mode: Mode::Main,
        old: false,
        rows: vec![],
        line: 0,
        anchor: None,
        comment: 0,
        comments_focus: false,
        horizontal: 0,
        draft: None,
        confirm: None,
        message: "Select lines with v, move, then c. Tab opens comments.".into(),
    };
    ui.rebuild();
    let mut checked = Instant::now();
    loop {
        terminal.draw(|f| render(f, &ui))?;
        if checked.elapsed() > Duration::from_secs(2) {
            ui.session.refresh();
            ui.rebuild();
            checked = Instant::now();
        }
        if !event::poll(Duration::from_millis(100))? {
            continue;
        }
        match event::read()? {
            Event::Key(key) if key.kind != KeyEventKind::Release => match ui.key(key) {
                Ok(true) => break,
                Ok(false) => {}
                Err(e) => ui.message = e.to_string(),
            },
            Event::Paste(text) => {
                if let Some(d) = &mut ui.draft {
                    d.text.insert_str(d.cursor, &text);
                    d.cursor += text.len();
                }
            }
            _ => {}
        }
    }
    drop(_restore);
    if let Some(path) = ui.session.last_saved {
        println!("Feedback: {}", clean(&path.display().to_string()));
    }
    Ok(())
}
