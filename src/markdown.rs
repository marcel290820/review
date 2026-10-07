//! Markdown for both interfaces: light styling marks for source lines, and inert HTML
//! for the browser preview. Marks are byte ranges; the text itself is unchanged, so
//! comment targets keep referring to exactly what is shown.

use crate::feedback::lines;
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, html};
use std::ops::Range;

pub const HEADING: u16 = 1;
pub const STRONG: u16 = 1 << 1;
pub const EMPHASIS: u16 = 1 << 2;
pub const STRIKE: u16 = 1 << 3;
pub const CODE: u16 = 1 << 4;
pub const QUOTE: u16 = 1 << 5;
pub const LINK: u16 = 1 << 6;
/// Markup characters: `#`, list markers, delimiters, fences, and link targets.
pub const SYNTAX: u16 = 1 << 7;

/// A byte range within one line and the flags of the elements containing it.
pub type Mark = (Range<usize>, u16);

pub fn is_markdown(path: &str) -> bool {
    let path = path.to_ascii_lowercase();
    path.ends_with(".md") || path.ends_with(".markdown")
}

/// Marks for each line of `text`, numbered like [`lines`]. Nested elements combine flags.
pub fn marks(text: &str) -> Vec<Vec<Mark>> {
    let mut flags = vec![0u16; text.len()];
    let mut paint = |range: Range<usize>, flag| flags[range].iter_mut().for_each(|f| *f |= flag);
    // The same delimiter at both ends of `range`, such as `**` or a backtick run.
    let ends = |range: &Range<usize>, chars: &[u8], most: usize| {
        let count = text.as_bytes()[range.clone()]
            .iter()
            .take_while(|b| chars.contains(b))
            .count()
            .min(most);
        vec![
            range.start..range.start + count,
            range.end - count..range.end,
        ]
    };
    let mut in_link = false;
    let parser = Parser::new_ext(text, Options::ENABLE_STRIKETHROUGH);
    for (event, range) in parser.into_offset_iter() {
        let delimiters = match &event {
            Event::Start(Tag::Heading { .. }) => {
                paint(range.clone(), HEADING);
                let hashes = text[range.clone()]
                    .bytes()
                    .take_while(|&b| b == b'#')
                    .count();
                paint(range.start..range.start + hashes, SYNTAX);
                Vec::new()
            }
            Event::Start(Tag::Item) => {
                let marker = text[range.clone()]
                    .find(char::is_whitespace)
                    .unwrap_or(range.len());
                paint(range.start..range.start + marker, SYNTAX);
                Vec::new()
            }
            Event::Start(Tag::Strong) => {
                paint(range.clone(), STRONG);
                ends(&range, b"*_", 2)
            }
            Event::Start(Tag::Emphasis) => {
                paint(range.clone(), EMPHASIS);
                ends(&range, b"*_", 1)
            }
            Event::Start(Tag::Strikethrough) => {
                paint(range.clone(), STRIKE);
                ends(&range, b"~", 2)
            }
            Event::Code(_) => {
                paint(range.clone(), CODE | if in_link { LINK } else { 0 });
                ends(&range, b"`", usize::MAX)
            }
            Event::Start(Tag::CodeBlock(_)) => {
                paint(range.clone(), CODE);
                fences(text, range)
            }
            Event::Start(Tag::BlockQuote(_)) => {
                paint(range, QUOTE);
                Vec::new()
            }
            // Brackets and the target stay quiet; the link text is underlined.
            Event::Start(Tag::Link { .. }) => {
                in_link = true;
                paint(range, SYNTAX);
                Vec::new()
            }
            Event::End(TagEnd::Link) => {
                in_link = false;
                Vec::new()
            }
            Event::Text(_) if in_link => {
                paint(range, LINK);
                Vec::new()
            }
            _ => Vec::new(),
        };
        for delimiter in delimiters {
            paint(delimiter, SYNTAX);
        }
    }
    // Link text lies inside the link's quiet range; the text itself stays readable.
    for flag in &mut flags {
        if *flag & LINK != 0 && *flag & CODE == 0 {
            *flag &= !SYNTAX;
        }
    }
    lines(text)
        .into_iter()
        .map(|line| {
            let end = line.start + text[line.clone()].trim_end_matches(['\n', '\r']).len();
            runs(&flags[line.start..end])
        })
        .collect()
}

/// The fence lines of a fenced code block.
fn fences(text: &str, block: Range<usize>) -> Vec<Range<usize>> {
    let mut start = block.start;
    text[block]
        .split_inclusive('\n')
        .filter_map(|line| {
            let range = start..start + line.len();
            start = range.end;
            let trimmed = line.trim_start();
            (trimmed.starts_with("```") || trimmed.starts_with("~~~")).then_some(range)
        })
        .collect()
}

/// Renders Markdown as inert HTML: raw HTML becomes text, and links and images are
/// reduced to their text, so a document cannot run scripts or request resources.
pub fn html(text: &str) -> String {
    let events = Parser::new(text).filter_map(|event| match event {
        Event::Html(raw) | Event::InlineHtml(raw) => Some(Event::Text(raw)),
        Event::Start(Tag::Link { .. } | Tag::Image { .. })
        | Event::End(TagEnd::Link | TagEnd::Image) => None,
        other => Some(other),
    });
    let mut output = String::new();
    html::push_html(&mut output, events);
    output
}

/// Consecutive bytes with the same nonzero flags.
fn runs(flags: &[u16]) -> Vec<Mark> {
    let mut runs: Vec<Mark> = Vec::new();
    for (i, &flag) in flags.iter().enumerate() {
        match runs.last_mut() {
            Some((range, last)) if *last == flag && range.end == i => range.end += 1,
            _ if flag != 0 => runs.push((i..i + 1, flag)),
            _ => {}
        }
    }
    runs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_is_inert() {
        let html = html(
            "# Heading\n<script>alert(1)</script>\n\n[x](javascript:evil) \
             ![alt](https://example.invalid/img)\n<iframe src='x'></iframe>",
        );
        assert!(html.contains("<h1>Heading</h1>"));
        for fragment in ["<script", "<iframe", "<img", "<a "] {
            assert!(!html.contains(fragment), "{html}");
        }
    }

    #[test]
    fn marks_stay_on_their_source_lines() {
        let marks = marks("# Plan\n- ship **now**\n\n> `x` [a](u)\r\n");
        assert_eq!(
            marks,
            vec![
                vec![(0..1, HEADING | SYNTAX), (1..6, HEADING)],
                vec![
                    (0..1, SYNTAX),
                    (7..9, STRONG | SYNTAX),
                    (9..12, STRONG),
                    (12..14, STRONG | SYNTAX),
                ],
                vec![],
                vec![
                    (0..2, QUOTE),
                    (2..3, QUOTE | CODE | SYNTAX),
                    (3..4, QUOTE | CODE),
                    (4..5, QUOTE | CODE | SYNTAX),
                    (5..6, QUOTE),
                    (6..7, QUOTE | SYNTAX),
                    (7..8, QUOTE | LINK),
                    (8..12, QUOTE | SYNTAX),
                ],
            ]
        );
    }
}
