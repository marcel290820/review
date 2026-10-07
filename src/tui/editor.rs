//! A small multiline text editor for comment drafts.

use super::text::{grapheme_width, text_width, wrap};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use unicode_segmentation::UnicodeSegmentation;

#[derive(Default)]
pub struct Editor {
    text: String,
    /// Byte offset of the cursor, always on a character boundary.
    cursor: usize,
    /// Cells per row where the composer wraps the text, once drawn. Up and Down follow
    /// those rows; before the first draw they follow lines.
    pub width: Option<usize>,
}

impl Editor {
    /// Starts with `text` and the cursor at its end.
    pub fn new(text: String) -> Self {
        Self {
            cursor: text.len(),
            text,
            width: None,
        }
    }

    pub fn text(&self) -> &str {
        &self.text
    }

    /// Inserts at the cursor. Pasted CRLF and CR line endings become `\n`.
    pub fn insert(&mut self, text: &str) {
        let text = text.replace("\r\n", "\n").replace('\r', "\n");
        self.text.insert_str(self.cursor, &text);
        self.cursor += text.len();
    }

    /// Byte offset of the cursor in [`Self::text`].
    pub fn cursor(&self) -> usize {
        self.cursor
    }

    pub fn key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Left => self.cursor = self.previous_char(),
            KeyCode::Right => self.cursor = self.next_char(),
            KeyCode::Home => self.cursor = self.line_start(self.cursor),
            KeyCode::End => self.cursor = self.line_end(self.cursor),
            KeyCode::Up => self.move_row(false),
            KeyCode::Down => self.move_row(true),
            KeyCode::Backspace => {
                let start = self.previous_char();
                self.text.replace_range(start..self.cursor, "");
                self.cursor = start;
            }
            KeyCode::Delete => {
                let end = self.next_char();
                self.text.replace_range(self.cursor..end, "");
            }
            KeyCode::Enter => self.insert("\n"),
            KeyCode::Char(c)
                if !key
                    .modifiers
                    .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT) =>
            {
                self.insert(c.encode_utf8(&mut [0; 4]));
            }
            _ => {}
        }
    }

    fn previous_char(&self) -> usize {
        self.text[..self.cursor]
            .char_indices()
            .next_back()
            .map_or(0, |(i, _)| i)
    }

    fn next_char(&self) -> usize {
        self.text[self.cursor..]
            .chars()
            .next()
            .map_or(self.cursor, |c| self.cursor + c.len_utf8())
    }

    fn line_start(&self, at: usize) -> usize {
        self.text[..at].rfind('\n').map_or(0, |i| i + 1)
    }

    fn line_end(&self, at: usize) -> usize {
        self.text[at..]
            .find('\n')
            .map_or(self.text.len(), |i| at + i)
    }

    /// Moves to the row above or below as the text wraps, keeping the column where it fits.
    fn move_row(&mut self, down: bool) {
        let rows = wrap(&self.text, self.width.unwrap_or(usize::MAX));
        // A cursor where one row wraps into the next shows at the start of the next.
        let row = rows
            .iter()
            .rposition(|r| r.start <= self.cursor)
            .unwrap_or(0);
        let next = if down {
            row.checked_add(1)
        } else {
            row.checked_sub(1)
        };
        let Some(next) = next.and_then(|i| rows.get(i)) else {
            return;
        };
        let column = text_width(&self.text[rows[row].start..self.cursor]);
        let (mut used, mut last) = (0, next.start);
        for (i, grapheme) in self.text[next.clone()].grapheme_indices(true) {
            used += grapheme_width(grapheme);
            if used > column {
                self.cursor = next.start + i;
                return;
            }
            last = next.start + i;
        }
        // Past the row's end. Where the text wraps on from there, that end would show
        // on the following row, so the cursor stops before the row's last character.
        let wraps_on = self.text[next.end..].starts_with(|c| c != '\n');
        self.cursor = if wraps_on { last } else { next.end };
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The cursor's zero-based line, and the text before the cursor on that line.
    fn cursor_line(editor: &Editor) -> (usize, &str) {
        let before = &editor.text()[..editor.cursor()];
        let start = before.rfind('\n').map_or(0, |i| i + 1);
        (before.matches('\n').count(), &before[start..])
    }

    fn press(editor: &mut Editor, codes: &[KeyCode]) {
        for &code in codes {
            editor.key(KeyEvent::from(code));
        }
    }

    #[test]
    fn edits_unicode_by_character() {
        let mut editor = Editor::new("é🦀".into());
        press(&mut editor, &[KeyCode::Left, KeyCode::Backspace]);
        assert_eq!(editor.text(), "🦀");
        press(&mut editor, &[KeyCode::Delete, KeyCode::Char('x')]);
        assert_eq!(editor.text(), "x");
    }

    #[test]
    fn vertical_moves_keep_the_column() {
        let mut editor = Editor::new("abcd\nx\nwxyz".into());
        press(&mut editor, &[KeyCode::Up]);
        assert_eq!(cursor_line(&editor), (1, "x"));
        press(&mut editor, &[KeyCode::Up]);
        assert_eq!(cursor_line(&editor), (0, "a"));
        press(&mut editor, &[KeyCode::Down, KeyCode::Down]);
        assert_eq!(cursor_line(&editor), (2, "w"));
        press(&mut editor, &[KeyCode::Down, KeyCode::End]);
        assert_eq!(cursor_line(&editor), (2, "wxyz"));
    }

    #[test]
    fn vertical_moves_follow_wrapped_rows() {
        // Rows: "stage it ", "per ", "region".
        let mut editor = Editor::new("stage it per region".into());
        editor.width = Some(9);
        let mut at = |code| {
            press(&mut editor, &[code]);
            editor.cursor()
        };
        assert_eq!(at(KeyCode::Up), 12);
        assert_eq!(at(KeyCode::Up), 3);
        assert_eq!(at(KeyCode::Up), 3);
        assert_eq!(at(KeyCode::Down), 12);
        assert_eq!(at(KeyCode::Down), 16);
        assert_eq!(at(KeyCode::Down), 16);
    }

    #[test]
    fn pasted_line_endings_become_newlines() {
        let mut editor = Editor::default();
        editor.insert("a\r\nb\rc");
        assert_eq!(editor.text(), "a\nb\nc");
        assert_eq!(cursor_line(&editor), (2, "c"));
    }
}
