//! Terminal review state and key handling, independent of drawing.

use super::editor::Editor;
use crate::{
    diff::{DiffKind, DiffRow},
    feedback::{ReviewFile, Side, Snapshot, line_range, lines},
    session::Session,
};
use anyhow::{Context, Result, ensure};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::ops::Range;

/// Rows moved by Page Up and Page Down.
const PAGE: usize = 12;
/// Columns moved by one horizontal scroll.
const SCROLL_STEP: usize = 8;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum View {
    /// The unified diff of a Git change, or the source of an opened file.
    Main,
    /// The full text of one snapshot.
    Snapshot(Side),
    /// The current disk content compared with the reviewed text; read-only.
    Disk,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Focus {
    Content,
    Comments,
}

/// Input that takes over the keyboard until it is finished or cancelled.
pub enum Prompt {
    Draft(Draft),
    ConfirmQuit,
    ConfirmDelete,
}

pub struct Draft {
    pub editor: Editor,
    purpose: Purpose,
}

enum Purpose {
    Add {
        file_id: String,
        snapshot_id: String,
        bytes: Range<usize>,
    },
    Edit {
        comment_id: String,
    },
}

/// One displayed line of content.
pub struct Row {
    pub text: String,
    /// `None` for source lines and messages.
    pub kind: Option<DiffKind>,
    /// The snapshot line a comment on this row targets; `None` when read-only.
    target: Option<(Side, usize)>,
}

pub struct App {
    pub session: Session,
    pub file: usize,
    pub view: View,
    /// The side that diff context lines target.
    context_side: Side,
    pub rows: Vec<Row>,
    pub cursor: usize,
    /// The other end of the line selection, while one is active.
    pub anchor: Option<usize>,
    /// First visible row, maintained while drawing.
    pub top: usize,
    pub scroll_x: usize,
    pub focus: Focus,
    /// Index of the selected comment.
    pub comment: usize,
    pub prompt: Option<Prompt>,
    pub message: String,
    pub quit: bool,
}

impl App {
    pub fn new(session: Session) -> Self {
        let mut app = Self {
            session,
            file: 0,
            view: View::Main,
            context_side: Side::New,
            rows: Vec::new(),
            cursor: 0,
            anchor: None,
            top: 0,
            scroll_x: 0,
            focus: Focus::Content,
            comment: 0,
            prompt: None,
            message: "Select lines with v, move, then c. Tab opens comments.".into(),
            quit: false,
        };
        app.rebuild();
        app
    }

    pub fn current_file(&self) -> &ReviewFile {
        &self.session.files()[self.file]
    }

    /// The selected rows as `(first, last)`; the cursor row without an active selection.
    pub fn selection(&self) -> (usize, usize) {
        let anchor = self.anchor.unwrap_or(self.cursor);
        (anchor.min(self.cursor), anchor.max(self.cursor))
    }

    pub fn handle_key(&mut self, key: KeyEvent) {
        if let Err(e) = self.dispatch(key) {
            self.message = format!("{e:#}");
        }
    }

    pub fn paste(&mut self, text: &str) {
        if let Some(Prompt::Draft(draft)) = &mut self.prompt {
            draft.editor.insert(text);
        }
    }

    /// Compares the files on disk with the review again.
    pub fn refresh(&mut self) {
        self.session.refresh();
        if self.view == View::Disk {
            self.rebuild();
        }
    }

    fn dispatch(&mut self, key: KeyEvent) -> Result<()> {
        let control = key.modifiers.contains(KeyModifiers::CONTROL);
        match &mut self.prompt {
            Some(Prompt::Draft(draft)) => match key.code {
                KeyCode::Esc => {
                    self.prompt = None;
                    self.message = "Draft cancelled".into();
                }
                KeyCode::Char('s') if control => self.record()?,
                _ => draft.editor.key(key),
            },
            Some(Prompt::ConfirmQuit) => match key.code {
                // A failed save keeps the prompt open, with the error beside it.
                KeyCode::Char('s') => {
                    self.save()?;
                    self.quit = true;
                }
                KeyCode::Char('d') => self.quit = true,
                KeyCode::Esc | KeyCode::Char('n') => self.prompt = None,
                _ => {}
            },
            Some(Prompt::ConfirmDelete) => match key.code {
                KeyCode::Char('y') => {
                    self.prompt = None;
                    self.delete_comment()?;
                }
                KeyCode::Esc | KeyCode::Char('n') => self.prompt = None,
                _ => {}
            },
            None => self.browse(key.code, control)?,
        }
        Ok(())
    }

    fn browse(&mut self, code: KeyCode, control: bool) -> Result<()> {
        match code {
            KeyCode::Char('c') if control => self.request_quit(),
            KeyCode::Char('q') => self.request_quit(),
            KeyCode::Char('s') => self.save()?,
            KeyCode::Tab => {
                self.focus = match self.focus {
                    Focus::Content => Focus::Comments,
                    Focus::Comments => Focus::Content,
                }
            }
            KeyCode::Char(']') => {
                self.show((self.file + 1) % self.session.files().len(), View::Main, 0)
            }
            KeyCode::Char('[') => {
                let count = self.session.files().len();
                self.show((self.file + count - 1) % count, View::Main, 0);
            }
            KeyCode::Char('b') => self.cycle_view(),
            KeyCode::Char('o') => self.set_context_side(Side::Old),
            KeyCode::Char('n') => self.set_context_side(Side::New),
            KeyCode::Char('r') => {
                self.session.refresh();
                let view = if self.view == View::Disk {
                    View::Main
                } else {
                    View::Disk
                };
                self.show(self.file, view, 0);
            }
            KeyCode::Left | KeyCode::Char('h') => {
                self.scroll_x = self.scroll_x.saturating_sub(SCROLL_STEP)
            }
            KeyCode::Right | KeyCode::Char('l') => self.scroll_x += SCROLL_STEP,
            KeyCode::Esc => self.anchor = None,
            code => match self.focus {
                Focus::Content => match navigate(code, self.cursor, self.rows.len()) {
                    Some(row) => self.cursor = row,
                    None => self.content_key(code)?,
                },
                Focus::Comments => {
                    match navigate(code, self.comment, self.session.comments().len()) {
                        Some(comment) => self.comment = comment,
                        None => self.comments_key(code)?,
                    }
                }
            },
        }
        Ok(())
    }

    fn content_key(&mut self, code: KeyCode) -> Result<()> {
        match code {
            KeyCode::Char('v') => {
                self.anchor = match self.anchor {
                    Some(_) => None,
                    None => Some(self.cursor),
                }
            }
            KeyCode::Char('c') => {
                self.prompt = Some(Prompt::Draft(Draft {
                    editor: Editor::default(),
                    purpose: self.selected_target()?,
                }));
            }
            _ => {}
        }
        Ok(())
    }

    fn comments_key(&mut self, code: KeyCode) -> Result<()> {
        if self.session.comments().is_empty() {
            return Ok(());
        }
        match code {
            KeyCode::Enter => self.revisit()?,
            KeyCode::Char('e') => {
                self.revisit()?;
                let comment = &self.session.comments()[self.comment];
                self.prompt = Some(Prompt::Draft(Draft {
                    editor: Editor::new(comment.body.clone()),
                    purpose: Purpose::Edit {
                        comment_id: comment.id.clone(),
                    },
                }));
            }
            KeyCode::Char('d') => {
                self.prompt = Some(Prompt::ConfirmDelete);
                self.message.clear();
            }
            _ => {}
        }
        Ok(())
    }

    fn request_quit(&mut self) {
        if self.session.is_dirty() {
            self.prompt = Some(Prompt::ConfirmQuit);
            self.message.clear();
        } else {
            self.quit = true;
        }
    }

    fn save(&mut self) -> Result<()> {
        let path = self.session.save()?;
        self.message = format!("Saved {}", path.display());
        Ok(())
    }

    /// Records the draft in the session; it reaches disk with the next save.
    fn record(&mut self) -> Result<()> {
        let Some(Prompt::Draft(draft)) = &self.prompt else {
            return Ok(());
        };
        let body = draft.editor.text().to_owned();
        match &draft.purpose {
            Purpose::Add {
                file_id,
                snapshot_id,
                bytes,
            } => {
                self.session
                    .add_comment(file_id, snapshot_id, bytes.clone(), body)?;
            }
            Purpose::Edit { comment_id } => self.session.edit_comment(comment_id, body)?,
        }
        self.prompt = None;
        self.anchor = None;
        self.message = "Comment recorded; s saves feedback to disk".into();
        Ok(())
    }

    fn delete_comment(&mut self) -> Result<()> {
        let id = self
            .session
            .comments()
            .get(self.comment)
            .context("No comment selected")?
            .id
            .clone();
        self.session.delete_comment(&id)?;
        self.comment = self
            .comment
            .min(self.session.comments().len().saturating_sub(1));
        self.message = "Comment deleted; s saves feedback to disk".into();
        Ok(())
    }

    /// Shows the selected comment's original target in its reviewed snapshot.
    fn revisit(&mut self) -> Result<()> {
        let target = &self.session.comments()[self.comment].target;
        let file = self
            .session
            .files()
            .iter()
            .position(|f| f.id == target.file_id)
            .context("The comment's file is not in this review")?;
        let (side, first, last) = (target.side, target.start_line, target.end_line);
        self.show(file, View::Snapshot(side), first - 1);
        self.message = format!("Original {side} L{first}–{last}");
        Ok(())
    }

    /// Cycles a Git change through its unified diff and each full snapshot.
    fn cycle_view(&mut self) {
        let file = self.current_file();
        if !file.is_diff() {
            self.message = "b switches sides of Git changes; this file has one source".into();
            return;
        }
        let sides: Vec<Side> = file.snapshots.iter().map(|s| s.side).collect();
        let next = match self.view {
            View::Main => sides.first().copied(),
            View::Snapshot(side) => sides.iter().skip_while(|&&s| s != side).nth(1).copied(),
            View::Disk => None,
        };
        self.show(self.file, next.map_or(View::Main, View::Snapshot), 0);
    }

    fn set_context_side(&mut self, side: Side) {
        self.context_side = side;
        self.rebuild();
        self.message = format!("Diff context lines target the {side} side");
    }

    fn show(&mut self, file: usize, view: View, cursor: usize) {
        self.file = file;
        self.view = view;
        self.cursor = cursor;
        self.anchor = None;
        self.scroll_x = 0;
        self.rebuild();
    }

    fn rebuild(&mut self) {
        let file = &self.session.files()[self.file];
        self.rows = match self.view {
            View::Main => match self.session.diff(self.file) {
                Some(diff) => diff_rows(diff, Some(self.context_side)),
                None => source_rows(&file.snapshots[0]),
            },
            View::Snapshot(side) => file.snapshot(side).map(source_rows).unwrap_or_default(),
            View::Disk => {
                let disk = self.session.disk(self.file);
                if disk.diff.is_empty() {
                    vec![Row::message(&disk.message)]
                } else {
                    diff_rows(&disk.diff, None)
                }
            }
        };
        if self.rows.is_empty() {
            self.rows.push(Row::message(
                "No textual changes; b shows the full old and new sources.",
            ));
        }
        let last = self.rows.len() - 1;
        self.cursor = self.cursor.min(last);
        self.anchor = self.anchor.map(|anchor| anchor.min(last));
    }

    /// The comment target for the selected rows.
    fn selected_target(&self) -> Result<Purpose> {
        let (first, last) = self.selection();
        let (side, start) = self.rows[first]
            .target
            .context("Select reviewed content; revisions are read-only")?;
        let (_, end) = self.rows[last]
            .target
            .context("End the selection on reviewed content")?;
        ensure!(
            self.rows[first..=last]
                .iter()
                .filter_map(|row| row.target)
                .all(|(s, _)| s == side),
            "Select a single diff side; b shows the full old and new sources"
        );
        let file = self.current_file();
        let snapshot = file.snapshot(side).context("This side has no snapshot")?;
        Ok(Purpose::Add {
            file_id: file.id.clone(),
            snapshot_id: snapshot.id.clone(),
            bytes: line_range(&snapshot.text, start, end)?,
        })
    }
}

impl Row {
    fn message(text: &str) -> Self {
        Self {
            text: text.into(),
            kind: None,
            target: None,
        }
    }
}

/// The new position after a navigation key in a list of `len` items, if `code` navigates.
fn navigate(code: KeyCode, position: usize, len: usize) -> Option<usize> {
    let last = len.saturating_sub(1);
    Some(match code {
        KeyCode::Down | KeyCode::Char('j') => (position + 1).min(last),
        KeyCode::Up | KeyCode::Char('k') => position.saturating_sub(1),
        KeyCode::PageDown => (position + PAGE).min(last),
        KeyCode::PageUp => position.saturating_sub(PAGE),
        KeyCode::Home | KeyCode::Char('g') => 0,
        KeyCode::End | KeyCode::Char('G') => last,
        _ => return None,
    })
}

/// Rows of a unified diff. Deleted lines target the old side, added lines the new side,
/// and context lines `context_side`; without a context side the rows are read-only.
fn diff_rows(diff: &[DiffRow], context_side: Option<Side>) -> Vec<Row> {
    let number = |line: Option<usize>| line.map(|n| n.to_string()).unwrap_or_default();
    diff.iter()
        .map(|row| {
            let side = match row.kind {
                DiffKind::Delete => Some(Side::Old),
                DiffKind::Add => Some(Side::New),
                DiffKind::Context => context_side,
                DiffKind::Hunk | DiffKind::Note => None,
            };
            let target = context_side.and(side).and_then(|side| {
                let line = if side == Side::Old {
                    row.old_line
                } else {
                    row.new_line
                };
                Some((side, line?))
            });
            let marker = match row.kind {
                DiffKind::Add => '+',
                DiffKind::Delete => '-',
                DiffKind::Context => ' ',
                DiffKind::Hunk | DiffKind::Note => '·',
            };
            Row {
                text: format!(
                    "{:>5} {:>5} {marker} {}",
                    number(row.old_line),
                    number(row.new_line),
                    without_line_end(&row.text)
                ),
                kind: Some(row.kind),
                target,
            }
        })
        .collect()
}

fn source_rows(snapshot: &Snapshot) -> Vec<Row> {
    lines(&snapshot.text)
        .into_iter()
        .enumerate()
        .map(|(i, range)| Row {
            text: format!("{:>5} {}", i + 1, without_line_end(&snapshot.text[range])),
            kind: None,
            target: Some((snapshot.side, i + 1)),
        })
        .collect()
}

/// Hides line terminators, including the `\r` of CRLF, from display.
fn without_line_end(line: &str) -> &str {
    line.trim_end_matches(['\n', '\r'])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn press(app: &mut App, codes: &[KeyCode]) {
        for &code in codes {
            app.handle_key(KeyEvent::from(code));
        }
    }

    fn record(app: &mut App, body: &str) {
        press(app, &[KeyCode::Char('c')]);
        app.paste(body);
        app.handle_key(KeyEvent::new(KeyCode::Char('s'), KeyModifiers::CONTROL));
    }

    #[test]
    fn a_failed_save_keeps_the_quit_prompt() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("note.md"), "text\n").unwrap();
        let output = dir.path().join("missing/out.json");
        let session = Session::open(&[dir.path().join("note.md")], output).unwrap();
        let mut app = App::new(session);
        record(&mut app, "request");
        assert_eq!(app.session.comments().len(), 1);

        press(&mut app, &[KeyCode::Char('q'), KeyCode::Char('s')]);
        assert!(!app.quit);
        assert!(matches!(app.prompt, Some(Prompt::ConfirmQuit)));
        assert!(app.message.contains("Save directory does not exist"));

        fs::create_dir(dir.path().join("missing")).unwrap();
        press(&mut app, &[KeyCode::Char('s')]);
        assert!(app.quit);
        assert!(dir.path().join("missing/out.json").exists());
    }

    #[test]
    fn diff_selections_stay_on_one_side() {
        let feedback_file = crate::feedback::ReviewFile::new(
            "note.txt".into(),
            vec![
                Snapshot::new(Side::Old, "base", "context\nold\n".into()),
                Snapshot::new(Side::New, "working tree", "context\nnew\n".into()),
            ],
        );
        let feedback =
            crate::feedback::Feedback::new(std::path::Path::new("/"), vec![feedback_file]);
        let dir = tempfile::tempdir().unwrap();
        let session = Session::new(feedback, None, dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        // Rows: hunk, context (new side until `o`), deleted line (old), added line (new).
        press(
            &mut app,
            &[
                KeyCode::Char('j'),
                KeyCode::Char('v'),
                KeyCode::Char('j'),
                KeyCode::Char('j'),
                KeyCode::Char('c'),
            ],
        );
        assert!(app.prompt.is_none());
        assert!(app.message.starts_with("Select a single diff side"));

        press(
            &mut app,
            &[
                KeyCode::Esc,
                KeyCode::Char('o'),
                KeyCode::Char('k'),
                KeyCode::Char('v'),
                KeyCode::Char('k'),
                KeyCode::Char('c'),
            ],
        );
        app.paste("old side");
        app.handle_key(KeyEvent::new(KeyCode::Char('s'), KeyModifiers::CONTROL));
        let target = &app.session.comments()[0].target;
        assert_eq!(
            (target.side, target.quote.as_str()),
            (Side::Old, "context\nold\n")
        );
    }
}
