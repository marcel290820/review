//! Text as the terminal shows it: cleaned of control characters, measured in cells per
//! user-perceived character, and wrapped between words.

use std::{iter, ops::Range};
use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

/// Makes text safe to print in a terminal: tabs become spaces and other control
/// characters a replacement mark, so content cannot emit escape sequences.
pub fn clean(text: &str) -> String {
    text.chars().flat_map(cleaned).collect()
}

pub fn cleaned(c: char) -> impl Iterator<Item = char> {
    match c {
        '\t' => iter::repeat_n(' ', 4),
        c if c.is_control() => iter::repeat_n('\u{FFFD}', 1),
        c => iter::repeat_n(c, 1),
    }
}

/// Cells a user-perceived character takes after [`clean`]: emoji sequences two, tabs four,
/// and other control characters, which always stand alone, one each.
pub fn grapheme_width(grapheme: &str) -> usize {
    if grapheme.contains(char::is_control) {
        grapheme
            .chars()
            .map(|c| if c == '\t' { 4 } else { 1 })
            .sum()
    } else {
        grapheme.width()
    }
}

pub fn text_width(text: &str) -> usize {
    text.graphemes(true).map(grapheme_width).sum()
}

/// Byte ranges of `text` in visual lines of at most `width` cells, broken after spaces where
/// possible. The ranges cover every byte except the `\n` between lines.
pub fn wrap(text: &str, width: usize) -> Vec<Range<usize>> {
    let width = width.max(1);
    let mut lines = Vec::new();
    let mut offset = 0;
    for line in text.split('\n') {
        let (mut start, mut used, mut space) = (offset, 0, None);
        for (i, grapheme) in line.grapheme_indices(true) {
            let at = offset + i;
            let w = grapheme_width(grapheme);
            // Breaking after a space carries its word along, which may still not fit.
            while used + w > width && at > start {
                let next = space.filter(|&s| s > start).unwrap_or(at);
                lines.push(start..next);
                used = text_width(&text[next..at]);
                start = next;
                space = None;
            }
            used += w;
            if grapheme == " " {
                space = Some(at + 1);
            }
        }
        lines.push(start..offset + line.len());
        offset += line.len() + 1;
    }
    lines
}

/// `text` cut to `width` cells, ending in `…` when cut.
pub fn fit(text: &str, width: usize) -> String {
    if text_width(text) <= width {
        return text.into();
    }
    let mut used = 1;
    let mut fitted: String = text
        .graphemes(true)
        .take_while(|grapheme| {
            used += grapheme_width(grapheme);
            used <= width
        })
        .collect();
    fitted.push('…');
    fitted
}

pub fn pad(text: &str, width: usize) -> String {
    format!(
        "{text}{}",
        " ".repeat(width.saturating_sub(text_width(text)))
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAMILY: &str = "👨‍👩‍👧";

    fn wrapped(text: &str, width: usize) -> Vec<&str> {
        wrap(text, width).into_iter().map(|r| &text[r]).collect()
    }

    #[test]
    fn wrap_breaks_between_words_and_keeps_every_byte() {
        assert_eq!(
            wrapped("stage it per region", 9),
            ["stage it ", "per ", "region"]
        );
        assert_eq!(
            wrapped("abcdefgh ij\n\nend", 4),
            ["abcd", "efgh", " ij", "", "end"]
        );
        assert_eq!(wrapped("🦀🦀🦀", 4), ["🦀🦀", "🦀"]);
        assert_eq!(wrapped(&FAMILY.repeat(2), 2), [FAMILY, FAMILY]);
        assert_eq!(wrapped("", 4), [""]);
        assert_eq!(wrapped(" ab\u{754c}", 3), [" ", "ab", "\u{754c}"]);
        for text in ["一 二三 四五六 x", "ab 🦀🦀 c\td 界界界", "a b 👨‍👩‍👧👨‍👩‍👧 c"]
        {
            for width in 2..8 {
                let rows = wrapped(text, width);
                // Only a character wider than the row, like a tab, may exceed it.
                let fits =
                    |row: &&str| text_width(row) <= width || row.graphemes(true).count() == 1;
                assert!(rows.iter().all(fits), "{rows:?}");
                assert_eq!(rows.concat(), text);
            }
        }
    }

    #[test]
    fn widths_count_what_the_terminal_shows() {
        assert_eq!(text_width(FAMILY), 2);
        assert_eq!(text_width("a\tb\u{7}"), 7);
        assert_eq!(text_width("e\u{301}"), 1);
    }

    #[test]
    fn fit_marks_cut_text() {
        assert_eq!(fit("short", 8), "short");
        assert_eq!(fit("a longer line", 8), "a longe…");
        let family = format!("{FAMILY} ok");
        assert_eq!(fit(&family, 5), family);
    }
}
