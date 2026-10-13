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
    let mut lines = Vec::new();
    let mut offset = 0;
    for line in text.split('\n') {
        let rows = wrap_line(line, width, 0, usize::MAX);
        lines.extend(rows.into_iter().map(|r| offset + r.start..offset + r.end));
        offset += line.len() + 1;
    }
    lines
}

/// Byte ranges of one line in at most `max` rows: the first `width` cells wide, the rest
/// `indent` cells narrower. Rows break after the last space that fits, but not within the
/// line's leading indentation, and otherwise where they are full.
pub fn wrap_line(line: &str, width: usize, indent: usize, max: usize) -> Vec<Range<usize>> {
    let graphemes: Vec<(usize, &str)> = line.grapheme_indices(true).collect();
    let at = |i: usize| graphemes.get(i).map_or(line.len(), |&(byte, _)| byte);
    let (mut rows, mut first, mut room, mut text) = (Vec::new(), 0, width.max(1), false);
    loop {
        // Each row takes at least one character, so the loop ends.
        let (mut used, mut end, mut space) = (0, first, None);
        while let Some(&(_, grapheme)) = graphemes.get(end) {
            let w = grapheme_width(grapheme);
            if used + w > room && end > first {
                break;
            }
            used += w;
            end += 1;
            if grapheme == " " && text {
                space = Some(end);
            }
            text |= !matches!(grapheme, " " | "\t");
        }
        if end == graphemes.len() {
            rows.push(at(first)..line.len());
            return rows;
        }
        let next = space.unwrap_or(end);
        rows.push(at(first)..at(next));
        if rows.len() >= max {
            return rows;
        }
        first = next;
        room = width.saturating_sub(indent).max(1);
    }
}

/// Cells that the wrapped rows of `line` indent by: its own indentation and a list or quote
/// marker after it, so a wrapped item stays apart from the next.
pub fn hanging_indent(line: &str) -> usize {
    let rest = line.trim_start_matches([' ', '\t']);
    let lead = text_width(&line[..line.len() - rest.len()]);
    let digits = rest.bytes().take_while(u8::is_ascii_digit).count();
    let marker = if ["- ", "* ", "+ ", "> "].iter().any(|m| rest.starts_with(m)) {
        2
    } else if (1..=9).contains(&digits)
        && [". ", ") "].iter().any(|m| rest[digits..].starts_with(m))
    {
        digits + 2
    } else {
        0
    };
    lead + marker
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

/// `text` cut to `width` cells from its start, beginning with `…` when cut, so a path keeps
/// its file name.
pub fn fit_start(text: &str, width: usize) -> String {
    if text_width(text) <= width {
        return text.into();
    }
    let mut used = 1;
    let kept: Vec<&str> = text
        .graphemes(true)
        .rev()
        .take_while(|grapheme| {
            used += grapheme_width(grapheme);
            used <= width
        })
        .collect();
    let mut fitted = String::from("…");
    fitted.extend(kept.into_iter().rev());
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
        // Leading indentation is no place to break.
        assert_eq!(wrapped(" ab\u{754c}", 3), [" ab", "\u{754c}"]);
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
    fn wrapped_rows_hang_under_their_first_and_stop_at_max() {
        let line = "- stage it per region";
        let rows: Vec<&str> = wrap_line(line, 9, 2, 9)
            .into_iter()
            .map(|r| &line[r])
            .collect();
        assert_eq!(rows, ["- stage ", "it per ", "region"]);
        assert_eq!(wrap_line(line, 9, 2, 2).len(), 2);
        assert_eq!(wrap_line("", 4, 0, 3).len(), 1);
        // An indent as wide as the row still leaves one cell.
        assert_eq!(wrap_line("abc", 2, 5, 9), [0..2, 2..3]);
        // Text carried onto a narrower row is wrapped again to fit it.
        for line in [
            " \tABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            "- ab cdefghijklmnop qr",
            "一 二三 四五六 x 🦀🦀 c\td",
        ] {
            for (width, indent) in [(32, 5), (9, 2), (6, 4), (3, 1)] {
                let rows = wrap_line(line, width, indent, usize::MAX);
                assert_eq!(rows.first().unwrap().start, 0);
                assert!(rows.windows(2).all(|w| w[0].end == w[1].start));
                assert_eq!(rows.last().unwrap().end, line.len());
                for (n, row) in rows.iter().enumerate() {
                    let room = if n == 0 { width } else { width - indent };
                    let row = &line[row.clone()];
                    let fits = text_width(row) <= room || row.graphemes(true).count() == 1;
                    assert!(fits, "{line:?} at {width}/{indent}: {rows:?}");
                }
            }
        }
    }

    #[test]
    fn hanging_indents_follow_indentation_and_list_markers() {
        assert_eq!(hanging_indent("plain"), 0);
        assert_eq!(hanging_indent("  - item"), 4);
        assert_eq!(hanging_indent("12. step"), 4);
        assert_eq!(hanging_indent("> quote"), 2);
        assert_eq!(hanging_indent("\tcode"), 4);
        assert_eq!(hanging_indent("-not a list"), 0);
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
        assert_eq!(fit_start("src/deep/file.rs", 9), "…/file.rs");
        assert_eq!(fit_start("short", 8), "short");
    }
}
