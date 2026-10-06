//! A small multiline text editor for comment drafts.

use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

#[derive(Default)]
pub struct Editor {
    text: String,
    /// Byte offset of the cursor, always on a character boundary.
    cursor: usize,
}

impl Editor {
    /// Starts with `text` and the cursor at its end.
    pub fn new(text: String) -> Self {
        Self {
            cursor: text.len(),
            text,
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

    /// The cursor's zero-based line, and the text before the cursor on that line.
    pub fn cursor_line(&self) -> (usize, &str) {
        let before = &self.text[..self.cursor];
        (
            before.matches('\n').count(),
            &before[self.line_start(self.cursor)..],
        )
    }

    pub fn key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Left => self.cursor = self.previous_char(),
            KeyCode::Right => self.cursor = self.next_char(),
            KeyCode::Home => self.cursor = self.line_start(self.cursor),
            KeyCode::End => self.cursor = self.line_end(self.cursor),
            KeyCode::Up => self.move_line(false),
            KeyCode::Down => self.move_line(true),
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

    /// Moves to the next or previous line, keeping the character column where it fits.
    fn move_line(&mut self, down: bool) {
        let start = self.line_start(self.cursor);
        let column = self.text[start..self.cursor].chars().count();
        let line = if down {
            let end = self.line_end(self.cursor);
            if end == self.text.len() {
                return;
            }
            end + 1
        } else {
            if start == 0 {
                return;
            }
            self.line_start(start - 1)
        };
        let end = self.line_end(line);
        self.cursor = self.text[line..end]
            .char_indices()
            .nth(column)
            .map_or(end, |(i, _)| line + i);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
        assert_eq!(editor.cursor_line(), (1, "x"));
        press(&mut editor, &[KeyCode::Up]);
        assert_eq!(editor.cursor_line(), (0, "a"));
        press(&mut editor, &[KeyCode::Down, KeyCode::Down]);
        assert_eq!(editor.cursor_line(), (2, "w"));
        press(&mut editor, &[KeyCode::Down, KeyCode::End]);
        assert_eq!(editor.cursor_line(), (2, "wxyz"));
    }

    #[test]
    fn pasted_line_endings_become_newlines() {
        let mut editor = Editor::default();
        editor.insert("a\r\nb\rc");
        assert_eq!(editor.text(), "a\nb\nc");
        assert_eq!(editor.cursor_line(), (2, "c"));
    }
}
