//! Terminal review state and key handling, independent of drawing.

use super::editor::Editor;
use crate::{
    diff::{DiffKind, DiffRow},
    feedback::{ReviewFile, Side, Snapshot, line_range, lines},
    files,
    markdown::{self, Mark},
    session::{DiskStatus, Session},
};
use anyhow::{Context, Result, ensure};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::{mem, ops::Range};

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
    /// The text the draft started with: empty, or the edited comment's body.
    original: String,
    /// Esc was pressed once on written text; a second Esc discards it.
    discarding: bool,
}

impl Draft {
    fn new(purpose: Purpose, original: String) -> Self {
        Self {
            editor: Editor::new(original.clone()),
            purpose,
            original,
            discarding: false,
        }
    }

    /// The comment being edited; `None` for a new comment on the selected rows.
    pub fn editing(&self) -> Option<&str> {
        match &self.purpose {
            Purpose::Add { .. } => None,
            Purpose::Edit { comment_id } => Some(comment_id),
        }
    }

    /// Whether discarding the draft would lose text the user wrote.
    fn written(&self) -> bool {
        let text = self.editor.text();
        !text.trim().is_empty() && text != self.original
    }
}

/// A short status message, shown until the next key press.
pub struct Notice {
    pub text: String,
    pub error: bool,
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
    /// The line without its terminator, a hunk header, or a message.
    pub text: String,
    /// `None` for source lines and messages.
    pub kind: Option<DiffKind>,
    /// The numbered lines this row shows: the snapshot line of a source row, or the
    /// old and new lines of a diff row.
    pub lines: [Option<(Side, usize)>; 2],
    /// The snapshot line a comment on this row targets; `None` when read-only.
    pub target: Option<(Side, usize)>,
    /// Markdown styling of `text`.
    pub marks: Vec<Mark>,
    /// Byte ranges of `text` that differ from the paired line on the other diff side.
    pub changes: Vec<Range<usize>>,
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
    pub notice: Option<Notice>,
    /// Whether the key list is shown.
    pub help: bool,
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
            notice: None,
            help: false,
            quit: false,
        };
        app.show(0, View::Main, None);
        app
    }

    pub fn current_file(&self) -> &ReviewFile {
        &self.session.files()[self.file]
    }

    /// Whether rows show old and new line numbers rather than one source line number.
    pub fn diff_layout(&self) -> bool {
        self.view == View::Disk || (self.view == View::Main && self.current_file().is_diff())
    }

    /// Comment indices in reading order: by file, then by position.
    pub fn comment_order(&self) -> Vec<usize> {
        let (files, comments) = (self.session.files(), self.session.comments());
        let mut order: Vec<usize> = (0..comments.len()).collect();
        order.sort_by_key(|&i| {
            let t = &comments[i].target;
            let file = files.iter().position(|f| f.id == t.file_id);
            (file, t.side == Side::New, t.start_line, t.end_line)
        });
        order
    }

    /// The selected rows as `(first, last)`; the cursor row without an active selection.
    pub fn selection(&self) -> (usize, usize) {
        let anchor = self.anchor.unwrap_or(self.cursor);
        (anchor.min(self.cursor), anchor.max(self.cursor))
    }

    pub fn handle_key(&mut self, key: KeyEvent) {
        self.notice = None;
        if let Err(e) = self.dispatch(key) {
            self.notice = Some(Notice {
                text: format!("{e:#}"),
                error: true,
            });
        }
    }

    fn say(&mut self, text: impl Into<String>) {
        self.notice = Some(Notice {
            text: text.into(),
            error: false,
        });
    }

    pub fn paste(&mut self, text: &str) {
        if let Some(Prompt::Draft(draft)) = &mut self.prompt {
            draft.discarding = false;
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
                // Written text takes a second Esc, so a habitual Esc cannot lose it.
                KeyCode::Esc if draft.written() && !draft.discarding => {
                    draft.discarding = true;
                    self.say("Press esc again to discard this draft.");
                }
                KeyCode::Esc => self.prompt = None,
                // Enter records, as in chat; Shift+Enter (where the terminal reports it),
                // Alt+Enter, and Ctrl+J start a new line.
                KeyCode::Enter
                    if !key
                        .modifiers
                        .intersects(KeyModifiers::SHIFT | KeyModifiers::ALT) =>
                {
                    draft.discarding = false;
                    self.record()?;
                }
                KeyCode::Char('j') if control => {
                    draft.discarding = false;
                    draft.editor.insert("\n");
                }
                _ => {
                    draft.discarding = false;
                    draft.editor.key(key);
                }
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
        // Any key closes the key list; ? and Esc do nothing else.
        if mem::take(&mut self.help) && matches!(code, KeyCode::Char('?') | KeyCode::Esc) {
            return Ok(());
        }
        match code {
            KeyCode::Char('?') => self.help = true,
            KeyCode::Char('c') if control => self.request_quit(),
            KeyCode::Char('q') => self.request_quit(),
            KeyCode::Char('s') => self.save()?,
            // `a` as in the browser, where Tab moves focus; Tab as well.
            KeyCode::Tab | KeyCode::Char('a') if self.focus == Focus::Comments => {
                self.focus = Focus::Content
            }
            KeyCode::Tab | KeyCode::Char('a') => {
                self.focus = Focus::Comments;
                // Choosing in the list moves the cursor, which must not stretch a selection.
                self.anchor = None;
                // The list opens on this file's comments.
                let comments = self.session.comments();
                let file = &self.current_file().id;
                if comments
                    .get(self.comment)
                    .is_none_or(|c| &c.target.file_id != file)
                {
                    let order = self.comment_order();
                    let here = order.iter().find(|&&i| &comments[i].target.file_id == file);
                    self.comment = here.or(order.first()).copied().unwrap_or(0);
                }
                self.follow();
            }
            KeyCode::Char(']') => self.show(
                (self.file + 1) % self.session.files().len(),
                View::Main,
                None,
            ),
            KeyCode::Char('[') => {
                let count = self.session.files().len();
                self.show((self.file + count - 1) % count, View::Main, None);
            }
            KeyCode::Char('b') => self.cycle_view(),
            KeyCode::Char('o') => self.set_context_side(Side::Old),
            KeyCode::Char('n') => self.set_context_side(Side::New),
            KeyCode::Char('r') if self.session.disk(self.file).status == DiskStatus::Detached => {
                self.say("Reopen with --root DIR to see changes on disk.");
            }
            KeyCode::Char('r') => {
                self.session.refresh();
                let view = if self.view == View::Disk {
                    View::Main
                } else {
                    View::Disk
                };
                self.show(self.file, view, None);
            }
            KeyCode::Left | KeyCode::Char('h') => {
                self.scroll_x = self.scroll_x.saturating_sub(SCROLL_STEP)
            }
            KeyCode::Right | KeyCode::Char('l') => self.scroll_x += SCROLL_STEP,
            KeyCode::Esc if self.focus == Focus::Comments => self.focus = Focus::Content,
            KeyCode::Esc => self.anchor = None,
            code => match self.focus {
                Focus::Content => match navigate(code, self.cursor, self.rows.len()) {
                    Some(row) => self.cursor = row,
                    None => self.content_key(code)?,
                },
                Focus::Comments => {
                    let order = self.comment_order();
                    let at = order.iter().position(|&i| i == self.comment).unwrap_or(0);
                    match navigate(code, at, order.len()) {
                        Some(at) => {
                            self.comment = order.get(at).copied().unwrap_or(0);
                            self.follow();
                        }
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
                let purpose = self.selected_target()?;
                self.prompt = Some(Prompt::Draft(Draft::new(purpose, String::new())));
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
            KeyCode::Enter => {
                self.revisit(true)?;
                self.focus = Focus::Content;
            }
            KeyCode::Char('e') => {
                self.revisit(false)?;
                let comment = &self.session.comments()[self.comment];
                let purpose = Purpose::Edit {
                    comment_id: comment.id.clone(),
                };
                self.prompt = Some(Prompt::Draft(Draft::new(purpose, comment.body.clone())));
            }
            KeyCode::Char('d') => self.prompt = Some(Prompt::ConfirmDelete),
            _ => {}
        }
        Ok(())
    }

    fn request_quit(&mut self) {
        if self.session.is_dirty() {
            self.prompt = Some(Prompt::ConfirmQuit);
        } else {
            self.quit = true;
        }
    }

    fn save(&mut self) -> Result<()> {
        let path = self.session.save()?;
        self.say(format!("Saved to {}", files::display(&path)));
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
        self.say("Comment recorded. Press s to save feedback.");
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
        let at = self.comment_order().iter().position(|&i| i == self.comment);
        self.session.delete_comment(&id)?;
        // Select the comment that took the deleted one's place in the list.
        let order = self.comment_order();
        self.comment = at
            .and_then(|at| order.get(at.min(order.len().saturating_sub(1))))
            .copied()
            .unwrap_or(0);
        self.follow();
        self.say("Comment deleted. Press s to save feedback.");
        Ok(())
    }

    /// Shows the chosen comment's lines with the cursor where the comment hangs: in the diff
    /// when it shows them, otherwise in its side's full text. `select` also selects them.
    fn revisit(&mut self, select: bool) -> Result<()> {
        let target = &self.session.comments()[self.comment].target;
        let file = self
            .session
            .files()
            .iter()
            .position(|f| f.id == target.file_id)
            .context("The comment's file is not in this review")?;
        let (side, first, last) = (target.side, target.start_line, target.end_line);
        self.show(file, View::Main, None);
        // The diff serves when it shows every line of the range, each on a row that takes
        // comments on the comment's side: context rows take the side `o` and `n` chose, and a
        // replaced line puts the other side's row in between. Otherwise the side's full text.
        let whole = |start: usize, end: usize| {
            end.checked_sub(start) == Some(last - first)
                && self.rows[start..=end]
                    .iter()
                    .all(|row| row.target.is_some_and(|(s, _)| s == side))
        };
        let rows = match (self.row_of(side, first), self.row_of(side, last)) {
            (Some(start), Some(end)) if whole(start, end) => (start, end),
            _ => {
                self.show(file, View::Snapshot(side), None);
                (first - 1, last - 1)
            }
        };
        self.anchor = select.then_some(rows.0);
        self.cursor = rows.1;
        Ok(())
    }

    /// Puts the cursor on the comment chosen in the list when this view shows it.
    fn follow(&mut self) {
        let Some(comment) = self.session.comments().get(self.comment) else {
            return;
        };
        let t = &comment.target;
        if self.view == View::Disk || t.file_id != self.current_file().id {
            return;
        }
        if let Some(row) = self.row_of(t.side, t.end_line) {
            self.cursor = row;
        }
    }

    /// The row showing line `line` of `side`.
    fn row_of(&self, side: Side, line: usize) -> Option<usize> {
        self.rows
            .iter()
            .position(|row| row.lines.contains(&Some((side, line))))
    }

    /// Cycles a Git change through its unified diff and each full snapshot.
    fn cycle_view(&mut self) {
        let file = self.current_file();
        if !file.is_diff() {
            self.say("b cycles the diff, old, and new views of Git changes.");
            return;
        }
        let sides: Vec<Side> = file.snapshots.iter().map(|s| s.side).collect();
        let next = match self.view {
            View::Main => sides.first().copied(),
            View::Snapshot(side) => sides.iter().skip_while(|&&s| s != side).nth(1).copied(),
            View::Disk => None,
        };
        self.show(self.file, next.map_or(View::Main, View::Snapshot), None);
    }

    fn set_context_side(&mut self, side: Side) {
        if !self.current_file().is_diff() {
            self.say("o and n apply to Git diffs.");
            return;
        }
        self.context_side = side;
        self.rebuild();
        self.say(format!(
            "Comments on context lines now go to the {side} side."
        ));
    }

    /// Shows `view` of `file` with the cursor on row `cursor`, or by default on the first line
    /// that takes comments, past a diff's first hunk label.
    fn show(&mut self, file: usize, view: View, cursor: Option<usize>) {
        self.file = file;
        self.view = view;
        self.anchor = None;
        self.scroll_x = 0;
        self.rebuild();
        let first = || self.rows.iter().position(|r| r.target.is_some());
        self.cursor = cursor.or_else(first).unwrap_or(0).min(self.rows.len() - 1);
    }

    fn rebuild(&mut self) {
        let file = &self.session.files()[self.file];
        let marks = |side| match file.snapshot(side) {
            Some(snapshot) if markdown::is_markdown(&file.path) => markdown::marks(&snapshot.text),
            _ => Vec::new(),
        };
        self.rows = match self.view {
            View::Main => match self.session.diff(self.file) {
                Some(diff) => diff_rows(
                    diff,
                    Some(self.context_side),
                    [&marks(Side::Old), &marks(Side::New)],
                ),
                None => {
                    let snapshot = &file.snapshots[0];
                    source_rows(snapshot, marks(snapshot.side))
                }
            },
            View::Snapshot(side) => file
                .snapshot(side)
                .map(|snapshot| source_rows(snapshot, marks(side)))
                .unwrap_or_default(),
            View::Disk => {
                let disk = self.session.disk(self.file);
                if disk.diff.is_empty() {
                    vec![Row::message(&disk.message)]
                } else {
                    diff_rows(&disk.diff, None, [&[], &[]])
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
        let read_only = || {
            if self.view == View::Disk {
                "Changes on disk are read-only. Press r to return to the review."
            } else {
                "Choose numbered lines; hunk labels take no comments."
            }
        };
        let (side, start) = self.rows[first].target.with_context(read_only)?;
        let (_, end) = self.rows[last].target.with_context(read_only)?;
        ensure!(
            self.rows[first..=last]
                .iter()
                .filter_map(|row| row.target)
                .all(|(s, _)| s == side),
            "Select a single diff side; b shows the full old and new sources."
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
            lines: [None, None],
            target: None,
            marks: Vec::new(),
            changes: Vec::new(),
        }
    }
}

/// The new position after a navigation key in a list of `len` items, if `code` navigates.
fn navigate(code: KeyCode, position: usize, len: usize) -> Option<usize> {
    let last = len.saturating_sub(1);
    Some(match code {
        KeyCode::Down | KeyCode::Char('j') => (position + 1).min(last),
        KeyCode::Up | KeyCode::Char('k') => position.saturating_sub(1),
        KeyCode::PageDown | KeyCode::Char(' ') => (position + PAGE).min(last),
        KeyCode::PageUp => position.saturating_sub(PAGE),
        KeyCode::Home | KeyCode::Char('g') => 0,
        KeyCode::End | KeyCode::Char('G') => last,
        _ => return None,
    })
}

/// Rows of a unified diff. Deleted lines target the old side, added lines the new side,
/// and context lines `context_side`; without a context side the rows are read-only.
/// `marks` style the old and new snapshot lines.
fn diff_rows(diff: &[DiffRow], context_side: Option<Side>, marks: [&[Vec<Mark>]; 2]) -> Vec<Row> {
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
            // Context text is the same on both sides; the new side's marks serve it.
            let marks = match row.kind {
                DiffKind::Delete => row.old_line.and_then(|n| marks[0].get(n - 1)),
                DiffKind::Add | DiffKind::Context => row.new_line.and_then(|n| marks[1].get(n - 1)),
                DiffKind::Hunk | DiffKind::Note => None,
            };
            Row {
                text: without_line_end(&row.text).into(),
                kind: Some(row.kind),
                lines: [
                    row.old_line.map(|n| (Side::Old, n)),
                    row.new_line.map(|n| (Side::New, n)),
                ],
                target,
                marks: marks.cloned().unwrap_or_default(),
                changes: row.changes.clone(),
            }
        })
        .collect()
}

fn source_rows(snapshot: &Snapshot, mut marks: Vec<Vec<Mark>>) -> Vec<Row> {
    lines(&snapshot.text)
        .into_iter()
        .enumerate()
        .map(|(i, range)| Row {
            text: without_line_end(&snapshot.text[range]).into(),
            kind: None,
            lines: [Some((snapshot.side, i + 1)), None],
            target: Some((snapshot.side, i + 1)),
            marks: marks.get_mut(i).map(mem::take).unwrap_or_default(),
            changes: Vec::new(),
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
        app.handle_key(KeyEvent::from(KeyCode::Enter));
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
        let notice = app.notice.as_ref().unwrap();
        assert!(notice.error && notice.text.contains("Save directory does not exist"));

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
        // The cursor starts past the hunk label, on the first line that takes comments.
        assert_eq!(app.cursor, 1);
        press(
            &mut app,
            &[
                KeyCode::Char('v'),
                KeyCode::Char('j'),
                KeyCode::Char('j'),
                KeyCode::Char('c'),
            ],
        );
        assert!(app.prompt.is_none());
        assert!(
            app.notice
                .as_ref()
                .is_some_and(|n| n.text.starts_with("Select a single diff side"))
        );

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
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        let target = &app.session.comments()[0].target;
        assert_eq!(
            (target.side, target.quote.as_str()),
            (Side::Old, "context\nold\n")
        );
    }

    #[test]
    fn the_comment_list_follows_reading_order() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.md"), "one\ntwo\nthree\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        // Recorded bottom-up: comment 0 is on line 3, comment 1 on line 1.
        press(&mut app, &[KeyCode::Char('G')]);
        record(&mut app, "third");
        press(&mut app, &[KeyCode::Char('g')]);
        record(&mut app, "first");
        assert_eq!(app.comment_order(), [1, 0]);

        press(&mut app, &[KeyCode::Tab, KeyCode::Char('g')]);
        assert_eq!(app.comment, 1);
        press(&mut app, &[KeyCode::Char('j')]);
        assert_eq!(app.comment, 0);
        // Deleting the first listed comment selects the one that moves into its place.
        press(
            &mut app,
            &[KeyCode::Char('k'), KeyCode::Char('d'), KeyCode::Char('y')],
        );
        assert_eq!(app.session.comments()[app.comment].body, "third");
    }

    #[test]
    fn enter_records_and_shift_alt_or_ctrl_j_start_a_new_line() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        press(&mut app, &[KeyCode::Char('c')]);
        app.paste("one");
        for modifiers in [KeyModifiers::SHIFT, KeyModifiers::ALT] {
            app.handle_key(KeyEvent::new(KeyCode::Enter, modifiers));
        }
        app.handle_key(KeyEvent::new(KeyCode::Char('j'), KeyModifiers::CONTROL));
        app.paste("two");
        press(&mut app, &[KeyCode::Enter]);
        assert!(app.prompt.is_none());
        assert_eq!(app.session.comments()[0].body, "one\n\n\ntwo");
    }

    #[test]
    fn the_comment_list_leads_to_its_comments() {
        let dir = tempfile::tempdir().unwrap();
        let text: String = (1..=30).map(|n| format!("line {n}\n")).collect();
        fs::write(dir.path().join("a.md"), text).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        press(&mut app, &[KeyCode::Char('v'), KeyCode::Char('j')]);
        record(&mut app, "first two");
        press(
            &mut app,
            &[KeyCode::Char('G'), KeyCode::Char('v'), KeyCode::Char('k')],
        );
        record(&mut app, "last two");
        press(&mut app, &[KeyCode::Char('g')]);

        // Choosing in the list moves the cursor to where the comment hangs.
        press(&mut app, &[KeyCode::Tab, KeyCode::Char('j')]);
        assert_eq!(app.cursor, 29);
        // Enter closes the list and selects the comment's lines.
        press(&mut app, &[KeyCode::Char('k'), KeyCode::Enter]);
        assert!(app.focus == Focus::Content);
        assert_eq!(app.selection(), (0, 1));
        // Esc closes the list, like the key list.
        press(&mut app, &[KeyCode::Esc, KeyCode::Tab, KeyCode::Esc]);
        assert!(app.focus == Focus::Content);
        // Opening the list shows its choice, and deleting shows the comment chosen next.
        press(&mut app, &[KeyCode::Char('G'), KeyCode::Tab]);
        assert_eq!(app.cursor, 1);
        press(&mut app, &[KeyCode::Char('d'), KeyCode::Char('y')]);
        assert_eq!(app.cursor, 29);
    }

    #[test]
    fn going_to_an_old_side_context_comment_keeps_its_side() {
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
        // A comment on the old side of the context line, then context back on the new side.
        press(&mut app, &[KeyCode::Char('o')]);
        record(&mut app, "old context");
        press(
            &mut app,
            &[KeyCode::Char('n'), KeyCode::Tab, KeyCode::Enter],
        );
        let Purpose::Add { snapshot_id, .. } = app.selected_target().unwrap() else {
            panic!("a new comment");
        };
        let old = app.current_file().snapshot(Side::Old).unwrap();
        assert_eq!(
            snapshot_id, old.id,
            "the selection targets the comment's side"
        );
    }

    #[test]
    fn going_to_a_comment_across_a_replacement_shows_its_side() {
        let feedback_file = crate::feedback::ReviewFile::new(
            "note.txt".into(),
            vec![
                Snapshot::new(Side::Old, "base", "a\nb\nc\n".into()),
                Snapshot::new(Side::New, "working tree", "a\nB\nc\n".into()),
            ],
        );
        let feedback =
            crate::feedback::Feedback::new(std::path::Path::new("/"), vec![feedback_file]);
        let dir = tempfile::tempdir().unwrap();
        let session = Session::new(feedback, None, dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        // New lines 1-3 in the full new text, so the diff's deleted old line 2 lies between.
        press(
            &mut app,
            &[KeyCode::Char('b'), KeyCode::Char('b'), KeyCode::Char('v')],
        );
        press(&mut app, &[KeyCode::Char('j'), KeyCode::Char('j')]);
        record(&mut app, "all three");
        press(
            &mut app,
            &[KeyCode::Char('b'), KeyCode::Tab, KeyCode::Enter],
        );
        assert!(app.view == View::Snapshot(Side::New));
        assert!(
            app.selected_target().is_ok(),
            "c comments on the same lines"
        );
    }

    #[test]
    fn the_list_does_not_stretch_a_selection() {
        let dir = tempfile::tempdir().unwrap();
        let text: String = (1..=20).map(|n| format!("line {n}\n")).collect();
        fs::write(dir.path().join("a.md"), text).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        press(&mut app, &[KeyCode::Char('G')]);
        record(&mut app, "last line");
        // Lines 1-3 selected, then the list opens and follows its comment to line 20.
        press(&mut app, &[KeyCode::Char('g'), KeyCode::Char('v')]);
        press(&mut app, &[KeyCode::Char('j'), KeyCode::Char('j')]);
        press(&mut app, &[KeyCode::Tab, KeyCode::Char('j'), KeyCode::Tab]);
        assert_eq!(app.selection(), (19, 19));
    }

    #[test]
    fn a_failed_record_needs_esc_twice_again() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        press(&mut app, &[KeyCode::Char('c')]);
        // Longer than a comment may be, so recording fails.
        app.paste(&"x".repeat(40 << 10));
        press(&mut app, &[KeyCode::Esc]);
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        assert!(app.notice.as_ref().is_some_and(|n| n.error));
        press(&mut app, &[KeyCode::Esc]);
        assert!(
            matches!(app.prompt, Some(Prompt::Draft(_))),
            "the draft survives"
        );
    }

    #[test]
    fn written_drafts_take_a_second_esc() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        press(&mut app, &[KeyCode::Char('c'), KeyCode::Esc]);
        assert!(app.prompt.is_none(), "an empty draft closes at once");

        press(&mut app, &[KeyCode::Char('c')]);
        app.paste("keep me");
        press(&mut app, &[KeyCode::Esc]);
        assert!(matches!(app.prompt, Some(Prompt::Draft(_))));
        assert!(
            app.notice
                .as_ref()
                .is_some_and(|n| n.text.contains("esc again"))
        );
        // Typing again needs another two presses.
        press(&mut app, &[KeyCode::Char('!'), KeyCode::Esc]);
        assert!(matches!(app.prompt, Some(Prompt::Draft(_))));
        press(&mut app, &[KeyCode::Esc]);
        assert!(app.prompt.is_none());

        // An edit that changed nothing closes at once.
        record(&mut app, "recorded");
        press(&mut app, &[KeyCode::Tab, KeyCode::Char('e'), KeyCode::Esc]);
        assert!(app.prompt.is_none());
    }
}
