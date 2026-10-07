//! Unified diff rows between two texts, numbered like [`crate::feedback::lines`].

use serde::Serialize;
use similar::{Algorithm, DiffTag, capture_diff_slices, group_diff_ops, udiff::UnifiedHunkHeader};
use std::ops::Range;

const CONTEXT_LINES: usize = 3;
/// Most words in a pair of changed lines that get word-level changes.
const MAX_WORDS: usize = 2000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DiffKind {
    Hunk,
    Context,
    Delete,
    Add,
    /// "\ No newline at end of file" after the preceding line.
    Note,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct DiffRow {
    pub kind: DiffKind,
    /// The line without its `\n`, or the hunk header or note.
    pub text: String,
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
}

pub fn diff(old: &str, new: &str) -> Vec<DiffRow> {
    // Split on '\n' only: similar's text tokenizer also breaks at a bare '\r',
    // which would shift line numbers away from comment targets.
    let old: Vec<&str> = old.split_inclusive('\n').collect();
    let new: Vec<&str> = new.split_inclusive('\n').collect();
    let mut rows = Vec::new();
    for hunk in group_diff_ops(
        capture_diff_slices(Algorithm::Myers, &old, &new),
        CONTEXT_LINES,
    ) {
        rows.push(DiffRow {
            kind: DiffKind::Hunk,
            text: UnifiedHunkHeader::new(&hunk).to_string(),
            old_line: None,
            new_line: None,
        });
        for op in hunk {
            let (tag, old_lines, new_lines) = op.as_tag_tuple();
            if tag == DiffTag::Equal {
                for (o, n) in old_lines.zip(new_lines) {
                    push_line(
                        &mut rows,
                        DiffKind::Context,
                        old[o],
                        Some(o + 1),
                        Some(n + 1),
                    );
                }
            } else {
                for o in old_lines {
                    push_line(&mut rows, DiffKind::Delete, old[o], Some(o + 1), None);
                }
                for n in new_lines {
                    push_line(&mut rows, DiffKind::Add, new[n], None, Some(n + 1));
                }
            }
        }
    }
    rows
}

/// Byte ranges of the words that differ between two versions of a line. Empty when the
/// lines share too little for word changes to help.
pub fn changed_words(old: &str, new: &str) -> (Vec<Range<usize>>, Vec<Range<usize>>) {
    let (old_words, new_words) = (words(old), words(new));
    // Diffing words costs up to the square of their count; very long lines go unmarked.
    if old_words.len() + new_words.len() > MAX_WORDS {
        return (Vec::new(), Vec::new());
    }
    let a: Vec<&str> = old_words.iter().map(|word| &old[word.clone()]).collect();
    let b: Vec<&str> = new_words.iter().map(|word| &new[word.clone()]).collect();
    // The bytes spanned by a run of words.
    let span = |words: &[Range<usize>], run: Range<usize>| {
        (!run.is_empty()).then(|| words[run.start].start..words[run.end - 1].end)
    };
    let visible = |text: &str| text.chars().filter(|c| !c.is_whitespace()).count();
    let (mut removed, mut added, mut same) = (Vec::new(), Vec::new(), 0);
    for op in capture_diff_slices(Algorithm::Myers, &a, &b) {
        let (tag, old_run, new_run) = op.as_tag_tuple();
        if tag == DiffTag::Equal {
            same += old_run.map(|i| visible(a[i])).sum::<usize>();
        } else {
            join(old, &mut removed, span(&old_words, old_run));
            join(new, &mut added, span(&new_words, new_run));
        }
    }
    // Below 40% shared text, highlighting words is noise.
    if same * 5 < visible(old).max(visible(new)) * 2 {
        return (Vec::new(), Vec::new());
    }
    (removed, added)
}

/// Adds `range` to `ranges`, merging it with the previous range across whitespace.
fn join(line: &str, ranges: &mut Vec<Range<usize>>, range: Option<Range<usize>>) {
    let Some(range) = range else { return };
    match ranges.last_mut() {
        Some(last) if line[last.end..range.start].trim().is_empty() => last.end = range.end,
        _ => ranges.push(range),
    }
}

/// Byte ranges of words, whitespace runs, and single other characters.
fn words(line: &str) -> Vec<Range<usize>> {
    let class = |c: char| {
        if c.is_alphanumeric() || c == '_' {
            0
        } else if c.is_whitespace() {
            1
        } else {
            2
        }
    };
    let mut words: Vec<Range<usize>> = Vec::new();
    let mut last = None;
    for (i, c) in line.char_indices() {
        let end = i + c.len_utf8();
        match words.last_mut() {
            Some(word) if class(c) != 2 && last == Some(class(c)) => word.end = end,
            _ => words.push(i..end),
        }
        last = Some(class(c));
    }
    words
}

fn push_line(
    rows: &mut Vec<DiffRow>,
    kind: DiffKind,
    line: &str,
    old_line: Option<usize>,
    new_line: Option<usize>,
) {
    let text = line.strip_suffix('\n');
    rows.push(DiffRow {
        kind,
        text: text.unwrap_or(line).into(),
        old_line,
        new_line,
    });
    if text.is_none() {
        rows.push(DiffRow {
            kind: DiffKind::Note,
            text: "\\ No newline at end of file".into(),
            old_line: None,
            new_line: None,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rows(old: &str, new: &str) -> Vec<(DiffKind, String, Option<usize>, Option<usize>)> {
        diff(old, new)
            .into_iter()
            .map(|r| (r.kind, r.text, r.old_line, r.new_line))
            .collect()
    }

    #[test]
    fn rows_use_target_line_numbers() {
        assert!(rows("same\n", "same\n").is_empty());
        // A bare '\r' is not a line break for targets, so it must not shift diff lines.
        assert_eq!(
            rows("a\rb\nold", "a\rb\nnew\n"),
            vec![
                (DiffKind::Hunk, "@@ -1,2 +1,2 @@".into(), None, None),
                (DiffKind::Context, "a\rb".into(), Some(1), Some(1)),
                (DiffKind::Delete, "old".into(), Some(2), None),
                (
                    DiffKind::Note,
                    "\\ No newline at end of file".into(),
                    None,
                    None
                ),
                (DiffKind::Add, "new".into(), None, Some(2)),
            ]
        );
        assert_eq!(rows("", "x\n")[0].1, "@@ -0,0 +1 @@");
    }

    #[test]
    fn changed_words_mark_only_what_differs() {
        let (old, new) = changed_words("    let total = 0;", "    let total: u64 = 0;");
        assert!(old.is_empty());
        assert_eq!(
            new.iter().map(|r| (r.start, r.end)).collect::<Vec<_>>(),
            [(13, 18)]
        );
        assert_eq!(changed_words("same", "different"), (vec![], vec![]));
        assert_eq!(changed_words("ü abcd", "ü wxyz"), (vec![], vec![]));
        let (old, _) = changed_words(
            "ship it on monday morning, as planned",
            "ship it on friday evening, as planned",
        );
        assert_eq!(
            old.iter().map(|r| (r.start, r.end)).collect::<Vec<_>>(),
            [(11, 25)]
        );
        // Long lines stay cheap: one word is one token, and too many words go unmarked.
        assert_eq!(words(&"x".repeat(100_000)).len(), 1);
        let many = |word: &str| format!("{word} ").repeat(MAX_WORDS);
        assert_eq!(changed_words(&many("a"), &many("b")), (vec![], vec![]));
    }

    #[test]
    fn distant_changes_form_separate_hunks() {
        let old: String = (1..=30).map(|n| format!("line {n}\n")).collect();
        let new = old
            .replace("line 2\n", "two\n")
            .replace("line 25\n", "25\n");
        let hunks = diff(&old, &new)
            .iter()
            .filter(|r| r.kind == DiffKind::Hunk)
            .count();
        assert_eq!(hunks, 2);
    }
}
