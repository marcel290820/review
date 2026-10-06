//! The portable feedback document: reviewed snapshots, comment targets, and validation.
//!
//! Targets are zero-based, half-open UTF-8 byte ranges into a snapshot's exact text.
//! Line numbers are one-based and inclusive; a line ends after its `\n`.

use anyhow::{Context, Result, ensure};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fmt,
    ops::Range,
    path::{Component, Path},
    time::{SystemTime, UNIX_EPOCH},
};

pub const FORMAT: &str = "review.feedback";
pub const VERSION: u32 = 1;

/// Largest snapshot text, in bytes.
pub const MAX_TEXT: usize = 2 << 20;
/// Largest total snapshot text in one review, in bytes.
pub const MAX_TOTAL_TEXT: usize = 16 << 20;
pub const MAX_FILES: usize = 256;
pub const MAX_COMMENTS: usize = 10_000;
/// Largest comment body, in bytes.
pub const MAX_BODY: usize = 32 << 10;
/// Largest feedback file, in bytes.
pub const MAX_FEEDBACK: usize = 64 << 20;

/// Characters of surrounding text stored on each side of a quote.
const CONTEXT_CHARS: usize = 80;

pub fn new_id() -> String {
    format!("{:032x}", rand::random::<u128>())
}

/// Seconds since the Unix epoch.
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_secs())
}

pub fn sha256(text: &str) -> String {
    Sha256::digest(text)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Side {
    /// An opened file.
    Source,
    /// The base of a Git comparison.
    Old,
    /// The head of a Git comparison.
    New,
}

impl fmt::Display for Side {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str(match self {
            Side::Source => "source",
            Side::Old => "old",
            Side::New => "new",
        })
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub id: String,
    pub side: Side,
    /// Where the text came from: "opened file", a commit, "index", or "working tree".
    pub revision: String,
    pub sha256: String,
    pub text: String,
}

impl Snapshot {
    pub fn new(side: Side, revision: &str, text: String) -> Self {
        Self {
            id: new_id(),
            side,
            revision: revision.into(),
            sha256: sha256(&text),
            text,
        }
    }
}

/// A reviewed file: one `source` snapshot, or `old` and/or `new` snapshots of a Git change.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewFile {
    pub id: String,
    /// Relative to the review's source root.
    pub path: String,
    pub snapshots: Vec<Snapshot>,
}

impl ReviewFile {
    pub fn new(path: String, snapshots: Vec<Snapshot>) -> Self {
        Self {
            id: new_id(),
            path,
            snapshots,
        }
    }

    pub fn is_diff(&self) -> bool {
        self.snapshots.iter().any(|s| s.side != Side::Source)
    }

    pub fn snapshot(&self, side: Side) -> Option<&Snapshot> {
        self.snapshots.iter().find(|s| s.side == side)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target {
    pub file_id: String,
    pub path: String,
    pub snapshot_id: String,
    pub side: Side,
    pub start_byte: usize,
    pub end_byte: usize,
    pub start_line: usize,
    pub end_line: usize,
    pub quote: String,
    pub before: String,
    pub after: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Comment {
    pub id: String,
    pub target: Target,
    pub body: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Feedback {
    pub format: String,
    pub version: u32,
    pub review_id: String,
    pub created_at: u64,
    pub saved_at: u64,
    /// The directory the paths were relative to. Informational only: never used for disk access.
    pub source_root_hint: String,
    pub files: Vec<ReviewFile>,
    pub comments: Vec<Comment>,
}

impl Feedback {
    pub fn new(source_root: &Path, files: Vec<ReviewFile>) -> Self {
        Self {
            format: FORMAT.into(),
            version: VERSION,
            review_id: new_id(),
            created_at: now(),
            saved_at: 0,
            source_root_hint: source_root.display().to_string(),
            files,
            comments: Vec::new(),
        }
    }

    /// Builds the target for `bytes` of a snapshot, with its quote and surrounding context.
    pub fn target(&self, file_id: &str, snapshot_id: &str, bytes: Range<usize>) -> Result<Target> {
        let file = self
            .files
            .iter()
            .find(|f| f.id == file_id)
            .context("Unknown reviewed file")?;
        let snapshot = file
            .snapshots
            .iter()
            .find(|s| s.id == snapshot_id)
            .context("Unknown reviewed snapshot")?;
        let text = snapshot.text.as_str();
        let Range { start, end } = bytes;
        let quote = text
            .get(start..end)
            .context("Target must be a valid UTF-8 byte range in the reviewed snapshot")?;
        ensure!(start < end || text.is_empty(), "Select some content");
        let before = text[..start]
            .char_indices()
            .rev()
            .nth(CONTEXT_CHARS - 1)
            .map_or(0, |(i, _)| i);
        let after = text[end..]
            .char_indices()
            .nth(CONTEXT_CHARS)
            .map_or(text.len(), |(i, _)| end + i);
        Ok(Target {
            file_id: file.id.clone(),
            path: file.path.clone(),
            snapshot_id: snapshot.id.clone(),
            side: snapshot.side,
            start_byte: start,
            end_byte: end,
            start_line: line_at(text, start),
            // The line holding the last selected byte, so a trailing '\n' stays on its line.
            end_line: line_at(text, if start < end { end - 1 } else { end }),
            quote: quote.into(),
            before: text[before..start].into(),
            after: text[end..after].into(),
        })
    }

    /// Checks everything an imported document claims: format, identities, checksums,
    /// limits, and that every comment target matches its snapshot exactly.
    pub fn validate(&self) -> Result<()> {
        ensure!(
            self.format == FORMAT && self.version == VERSION,
            "Unsupported feedback format or version"
        );
        ensure!(
            (1..=MAX_FILES).contains(&self.files.len()),
            "Feedback must contain 1–{MAX_FILES} files"
        );
        // File, snapshot, and comment identifiers share one namespace.
        let mut ids = HashSet::new();
        let mut paths = HashSet::new();
        let mut total_text = 0;
        for file in &self.files {
            check_relative(&file.path)?;
            ensure!(
                !file.id.is_empty() && ids.insert(&file.id) && paths.insert(&file.path),
                "Duplicate or empty file identifier or path: {}",
                file.path
            );
            ensure!(
                (1..=2).contains(&file.snapshots.len()),
                "{} must have one or two snapshots",
                file.path
            );
            let mut sides = HashSet::new();
            for snapshot in &file.snapshots {
                ensure!(
                    !snapshot.id.is_empty()
                        && ids.insert(&snapshot.id)
                        && sides.insert(snapshot.side),
                    "Duplicate or empty snapshot identifier or side in {}",
                    file.path
                );
                ensure!(
                    snapshot.text.len() <= MAX_TEXT
                        && !snapshot.text.contains('\0')
                        && sha256(&snapshot.text) == snapshot.sha256,
                    "Snapshot content or checksum is invalid in {}",
                    file.path
                );
                total_text += snapshot.text.len();
            }
            ensure!(
                !sides.contains(&Side::Source) || sides.len() == 1,
                "{} must have either one source snapshot or old/new snapshots",
                file.path
            );
        }
        ensure!(
            total_text <= MAX_TOTAL_TEXT,
            "Reviewed content exceeds the 16 MiB limit"
        );
        ensure!(self.comments.len() <= MAX_COMMENTS, "Too many comments");
        for comment in &self.comments {
            ensure!(
                !comment.id.is_empty() && ids.insert(&comment.id),
                "Duplicate or empty comment identifier"
            );
            check_body(&comment.body)?;
            let target = &comment.target;
            let expected = self.target(
                &target.file_id,
                &target.snapshot_id,
                target.start_byte..target.end_byte,
            )?;
            ensure!(
                expected == *target,
                "Comment {} does not match its reviewed snapshot",
                comment.id
            );
        }
        Ok(())
    }
}

pub fn check_body(body: &str) -> Result<()> {
    ensure!(
        !body.trim().is_empty() && body.len() <= MAX_BODY,
        "Comment must contain text and be at most 32 KiB"
    );
    Ok(())
}

/// Accepts only non-empty relative paths without `.`, `..`, or root components.
pub fn check_relative(path: &str) -> Result<()> {
    ensure!(
        !path.is_empty()
            && Path::new(path)
                .components()
                .all(|c| matches!(c, Component::Normal(_))),
        "File paths must be relative without parent traversal: {path:?}"
    );
    Ok(())
}

/// Byte range of each line, including its `\n`. An empty text has one empty line.
pub fn lines(text: &str) -> Vec<Range<usize>> {
    let mut start = 0;
    let mut ranges: Vec<_> = text
        .split_inclusive('\n')
        .map(|line| {
            start += line.len();
            start - line.len()..start
        })
        .collect();
    if ranges.is_empty() {
        ranges.push(0..0);
    }
    ranges
}

/// Byte range covering lines `first..=last`.
pub fn line_range(text: &str, first: usize, last: usize) -> Result<Range<usize>> {
    let lines = lines(text);
    ensure!(
        1 <= first && first <= last && last <= lines.len(),
        "Choose an existing line range"
    );
    Ok(lines[first - 1].start..lines[last - 1].end)
}

/// One-based line containing byte `offset`.
fn line_at(text: &str, offset: usize) -> usize {
    text.as_bytes()[..offset]
        .iter()
        .filter(|&&b| b == b'\n')
        .count()
        + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    fn feedback(text: &str) -> Feedback {
        let file = ReviewFile::new(
            "note.md".into(),
            vec![Snapshot::new(Side::Source, "opened file", text.into())],
        );
        Feedback::new(Path::new("/"), vec![file])
    }

    fn target(feedback: &Feedback, bytes: Range<usize>) -> Result<Target> {
        let file = &feedback.files[0];
        feedback.target(&file.id, &file.snapshots[0].id, bytes)
    }

    #[test]
    fn lines_keep_terminators_and_never_invent_a_final_line() {
        assert_eq!(lines("a\n"), vec![0..2]);
        assert_eq!(lines("a\r\nb"), vec![0..3, 3..4]);
        assert_eq!(lines(""), vec![0..0]);
        assert_eq!(line_range("é🦀\r\nx\n", 1, 2).unwrap(), 0..10);
        assert!(line_range("a", 1, 2).is_err());
        assert!(line_range("a\nb", 2, 1).is_err());
        assert!(line_range("a", 0, 1).is_err());
    }

    #[test]
    fn targets_are_exact_utf8_ranges_with_context() {
        let f = feedback("é🦀\nlast\n");
        assert!(target(&f, 1..2).is_err(), "inside a character");
        assert!(target(&f, 0..99).is_err(), "past the end");
        assert!(target(&f, 2..2).is_err(), "empty selection");
        let t = target(&f, 2..6).unwrap();
        assert_eq!((t.quote.as_str(), t.start_line, t.end_line), ("🦀", 1, 1));
        assert_eq!((t.before.as_str(), t.after.as_str()), ("é", "\nlast\n"));
        // A selected trailing newline stays on its own line.
        let t = target(&f, 0..7).unwrap();
        assert_eq!((t.start_line, t.end_line), (1, 1));

        let empty = feedback("");
        assert_eq!(target(&empty, 0..0).unwrap().quote, "");
    }

    #[test]
    fn context_is_limited_to_eighty_characters() {
        let text = format!("{}target{}", "b".repeat(100), "a".repeat(100));
        let f = feedback(&text);
        let t = target(&f, 100..106).unwrap();
        assert_eq!((t.before.len(), t.after.len()), (80, 80));
    }

    #[test]
    fn relative_paths_reject_traversal() {
        for bad in ["", "../x", "/abs", "a/../b", "./a"] {
            assert!(check_relative(bad).is_err(), "{bad}");
        }
        check_relative("dir/file name.md").unwrap();
    }
}
