//! Unified diff rows between two texts, numbered like [`crate::feedback::lines`].

use serde::Serialize;
use similar::{Algorithm, DiffTag, capture_diff_slices, group_diff_ops, udiff::UnifiedHunkHeader};

const CONTEXT_LINES: usize = 3;

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
