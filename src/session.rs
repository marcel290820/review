//! One review in memory: reviewed snapshots, comment changes, saving, and disk revisions.

use crate::{
    diff::{DiffRow, diff},
    feedback::{
        Comment, Feedback, MAX_COMMENTS, MAX_FEEDBACK, MAX_FILES, ReviewFile, Side, Snapshot,
        check_body, new_id, now,
    },
    files::{read_below, read_bounded, read_text, save_new},
};
use anyhow::{Context, Result, ensure};
use serde::Serialize;
use std::{
    env, mem,
    ops::Range,
    path::{self, Path, PathBuf},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DiskStatus {
    /// No revision root was authorized, so the disk is never read.
    Detached,
    Unchanged,
    Changed,
    Missing,
    Unavailable,
}

impl DiskStatus {
    pub fn label(self) -> &'static str {
        match self {
            DiskStatus::Detached => "detached",
            DiskStatus::Unchanged => "unchanged",
            DiskStatus::Changed => "changed",
            DiskStatus::Missing => "missing",
            DiskStatus::Unavailable => "unavailable",
        }
    }
}

/// The current disk content of a reviewed file, compared with what was reviewed.
#[derive(Clone, Debug, Serialize)]
pub struct DiskState {
    pub file_id: String,
    pub status: DiskStatus,
    pub message: String,
    /// From the reviewed text to the disk text, when changed.
    pub diff: Vec<DiffRow>,
}

struct FileState {
    /// Between the old and new snapshots; `None` for opened files.
    diff: Option<Vec<DiffRow>>,
    disk: DiskState,
    /// Disk text behind a `Changed` state, kept to skip recomparing unchanged content.
    disk_text: Option<String>,
}

pub struct Session {
    feedback: Feedback,
    /// In `feedback.files` order.
    files: Vec<FileState>,
    /// The authorized directory for revision reads.
    root: Option<PathBuf>,
    output: PathBuf,
    dirty: bool,
    last_saved: Option<PathBuf>,
}

impl Session {
    /// Starts a review of files on disk. Paths are stored relative to the invocation
    /// directory when it contains every file, otherwise to the files' common directory.
    pub fn open(paths: &[PathBuf], output: PathBuf) -> Result<Self> {
        ensure!(
            (1..=MAX_FILES).contains(&paths.len()),
            "Select 1–{MAX_FILES} files"
        );
        let paths = paths
            .iter()
            .map(|p| {
                p.canonicalize()
                    .with_context(|| format!("Cannot find {}", p.display()))
            })
            .collect::<Result<Vec<_>>>()?;
        let root = common_root(&paths)?;
        let files = paths
            .iter()
            .map(|path| {
                let text = read_text(path)?;
                let relative = path
                    .strip_prefix(&root)?
                    .to_str()
                    .context("File paths must be UTF-8")?;
                let snapshot = Snapshot::new(Side::Source, "opened file", text);
                Ok(ReviewFile::new(relative.into(), vec![snapshot]))
            })
            .collect::<Result<_>>()?;
        Self::new(Feedback::new(&root, files), Some(root), output)
    }

    /// Reopens saved feedback. Revisions are read only below an explicit `root`;
    /// the document's own `source_root_hint` is never trusted for disk access.
    pub fn reopen(feedback: &Path, root: Option<PathBuf>, output: PathBuf) -> Result<Self> {
        let document = serde_json::from_slice(&read_bounded(feedback, MAX_FEEDBACK)?)
            .with_context(|| format!("{} is not valid feedback JSON", feedback.display()))?;
        let mut session = Self::new(document, root, output)?;
        session.last_saved = Some(path::absolute(feedback)?);
        Ok(session)
    }

    pub fn new(feedback: Feedback, root: Option<PathBuf>, output: PathBuf) -> Result<Self> {
        feedback.validate()?;
        let root = root
            .map(|root| {
                let root = root
                    .canonicalize()
                    .with_context(|| format!("Cannot find revision root {}", root.display()))?;
                ensure!(root.is_dir(), "Revision root must be a directory");
                Ok(root)
            })
            .transpose()?;
        let files = feedback
            .files
            .iter()
            .map(|file| {
                let text = |side| file.snapshot(side).map_or("", |s| s.text.as_str());
                FileState {
                    diff: file
                        .is_diff()
                        .then(|| diff(text(Side::Old), text(Side::New))),
                    disk: DiskState {
                        file_id: file.id.clone(),
                        status: DiskStatus::Detached,
                        message: "Snapshots only. Reopen with --root DIR to inspect revisions."
                            .into(),
                        diff: Vec::new(),
                    },
                    disk_text: None,
                }
            })
            .collect();
        let mut session = Self {
            feedback,
            files,
            root,
            output: path::absolute(output)?,
            dirty: false,
            last_saved: None,
        };
        session.refresh();
        Ok(session)
    }

    pub fn feedback(&self) -> &Feedback {
        &self.feedback
    }

    pub fn files(&self) -> &[ReviewFile] {
        &self.feedback.files
    }

    pub fn comments(&self) -> &[Comment] {
        &self.feedback.comments
    }

    /// The unified diff of a Git change, by file index; `None` for opened files.
    pub fn diff(&self, file: usize) -> Option<&[DiffRow]> {
        self.files[file].diff.as_deref()
    }

    pub fn disk(&self, file: usize) -> &DiskState {
        &self.files[file].disk
    }

    pub fn disk_states(&self) -> impl Iterator<Item = &DiskState> {
        self.files.iter().map(|f| &f.disk)
    }

    pub fn output(&self) -> &Path {
        &self.output
    }

    pub fn last_saved(&self) -> Option<&Path> {
        self.last_saved.as_deref()
    }

    /// Whether comments changed since the review was opened or last saved.
    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    pub fn add_comment(
        &mut self,
        file_id: &str,
        snapshot_id: &str,
        bytes: Range<usize>,
        body: String,
    ) -> Result<String> {
        check_body(&body)?;
        ensure!(
            self.feedback.comments.len() < MAX_COMMENTS,
            "Too many comments"
        );
        let target = self.feedback.target(file_id, snapshot_id, bytes)?;
        let id = new_id();
        let now = now();
        self.feedback.comments.push(Comment {
            id: id.clone(),
            target,
            body,
            created_at: now,
            updated_at: now,
        });
        self.dirty = true;
        Ok(id)
    }

    /// Replaces a comment's body; its target never moves.
    pub fn edit_comment(&mut self, id: &str, body: String) -> Result<()> {
        check_body(&body)?;
        let comment = self
            .feedback
            .comments
            .iter_mut()
            .find(|c| c.id == id)
            .context("Unknown comment")?;
        comment.body = body;
        comment.updated_at = now();
        self.dirty = true;
        Ok(())
    }

    pub fn delete_comment(&mut self, id: &str) -> Result<()> {
        let index = self
            .feedback
            .comments
            .iter()
            .position(|c| c.id == id)
            .context("Unknown comment")?;
        self.feedback.comments.remove(index);
        self.dirty = true;
        Ok(())
    }

    /// Writes the feedback to a new file and returns its path. On failure the
    /// session keeps its unsaved state.
    pub fn save(&mut self) -> Result<PathBuf> {
        let previous = mem::replace(&mut self.feedback.saved_at, now());
        let path = self
            .publish()
            .inspect_err(|_| self.feedback.saved_at = previous)?;
        self.dirty = false;
        self.last_saved = Some(path.clone());
        Ok(path)
    }

    fn publish(&self) -> Result<PathBuf> {
        let mut data = serde_json::to_vec_pretty(&self.feedback)?;
        data.push(b'\n');
        ensure!(
            data.len() <= MAX_FEEDBACK,
            "Feedback exceeds the 64 MiB limit"
        );
        save_new(&self.output, &data)
    }

    /// Compares each file below the authorized root with its reviewed text.
    pub fn refresh(&mut self) {
        let Some(root) = &self.root else { return };
        for (file, state) in self.feedback.files.iter().zip(&mut self.files) {
            state.inspect(root, file);
        }
    }
}

impl FileState {
    fn inspect(&mut self, root: &Path, file: &ReviewFile) {
        // An opened file's source, or the new side of a Git change.
        let reviewed = file
            .snapshots
            .iter()
            .find(|s| s.side != Side::Old)
            .map(|s| s.text.as_str());
        let (status, message, diff, disk_text) = match read_below(root, &file.path) {
            Ok(None) => (
                DiskStatus::Missing,
                format!("{} is missing on disk.", file.path),
                Vec::new(),
                None,
            ),
            Err(e) => (
                DiskStatus::Unavailable,
                format!("{}: {e:#}", file.path),
                Vec::new(),
                None,
            ),
            Ok(Some(text)) if reviewed == Some(text.as_str()) => (
                DiskStatus::Unchanged,
                "Disk content matches the reviewed snapshot.".into(),
                Vec::new(),
                None,
            ),
            Ok(Some(text)) if self.disk_text.as_ref() == Some(&text) => return,
            Ok(Some(text)) => (
                DiskStatus::Changed,
                "Disk content changed. Comments still refer to the reviewed snapshot.".into(),
                diff(reviewed.unwrap_or(""), &text),
                Some(text),
            ),
        };
        self.disk.status = status;
        self.disk.message = message;
        self.disk.diff = diff;
        self.disk_text = disk_text;
    }
}

/// The invocation directory when it contains every path, otherwise their deepest common directory.
fn common_root(paths: &[PathBuf]) -> Result<PathBuf> {
    let cwd = env::current_dir()?.canonicalize()?;
    if paths.iter().all(|p| p.starts_with(&cwd)) {
        return Ok(cwd);
    }
    let mut root = paths[0]
        .parent()
        .context("A selected file has no parent directory")?
        .to_path_buf();
    while !paths.iter().all(|p| p.starts_with(&root)) {
        ensure!(root.pop(), "Selected files share no common directory");
    }
    Ok(root)
}
