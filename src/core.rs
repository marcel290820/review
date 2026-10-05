use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub const MAX_TEXT: usize = 2 * 1024 * 1024;
pub const MAX_SESSION: usize = 16 * 1024 * 1024;
pub const MAX_FEEDBACK: usize = 64 * 1024 * 1024;
pub const MAX_COMMENT: usize = 32 * 1024;

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
pub fn hash(text: &str) -> String {
    format!("{:x}", Sha256::digest(text.as_bytes()))
}
pub fn id() -> String {
    format!("{:032x}", rand::random::<u128>())
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Side {
    Source,
    Old,
    New,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub id: String,
    pub side: Side,
    pub revision: String,
    pub sha256: String,
    pub text: String,
}
impl Snapshot {
    pub fn new(side: Side, revision: String, text: String) -> Self {
        Self {
            id: id(),
            side,
            revision,
            sha256: hash(&text),
            text,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DiffRow {
    pub kind: String,
    pub text: String,
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewFile {
    pub id: String,
    pub path: String,
    pub snapshots: Vec<Snapshot>,
    pub diff: Option<Vec<DiffRow>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
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
    pub source_root_hint: String,
    pub files: Vec<ReviewFile>,
    pub comments: Vec<Comment>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Revision {
    pub file_id: String,
    pub state: String,
    pub message: String,
    pub text: Option<String>,
    pub diff: Vec<DiffRow>,
}

#[derive(Clone, Debug, Serialize)]
pub struct View {
    pub feedback: Feedback,
    pub revisions: Vec<Revision>,
    pub revision: u64,
    pub dirty: bool,
    pub output: String,
    pub last_saved: Option<String>,
    pub previews: Vec<Preview>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Preview {
    pub snapshot_id: String,
    pub html: String,
}

pub struct Session {
    pub feedback: Feedback,
    pub root: Option<PathBuf>,
    pub output: PathBuf,
    pub revision: u64,
    pub dirty: bool,
    pub last_saved: Option<PathBuf>,
    pub revisions: Vec<Revision>,
}

pub fn read_bounded(path: &Path, limit: usize) -> Result<Vec<u8>> {
    ensure!(
        fs::metadata(path)?.is_file(),
        "{} is not a regular file",
        path.display()
    );
    let file = fs::File::open(path).with_context(|| format!("Cannot open {}", path.display()))?;
    ensure!(
        file.metadata()?.is_file(),
        "{} is not a regular file",
        path.display()
    );
    let mut data = Vec::new();
    file.take((limit + 1) as u64).read_to_end(&mut data)?;
    ensure!(
        data.len() <= limit,
        "{} exceeds the {} byte limit",
        path.display(),
        limit
    );
    Ok(data)
}
pub fn text_bytes(data: Vec<u8>) -> Result<String> {
    ensure!(!data.contains(&0), "Binary content is outside this version");
    String::from_utf8(data).context("Content must be UTF-8 text")
}
pub fn read_text(path: &Path) -> Result<String> {
    text_bytes(read_bounded(path, MAX_TEXT)?)
}

pub fn safe_relative(path: &str) -> Result<()> {
    ensure!(!path.is_empty(), "Empty file path");
    ensure!(
        Path::new(path)
            .components()
            .all(|c| matches!(c, Component::Normal(_))),
        "File paths must be relative and contain no parent traversal"
    );
    Ok(())
}
pub fn selected_path(root: &Path, path: &str) -> Result<PathBuf> {
    safe_relative(path)?;
    let mut current = root.to_path_buf();
    for part in Path::new(path).components() {
        current.push(part.as_os_str());
        let meta = fs::symlink_metadata(&current)?;
        ensure!(
            !meta.file_type().is_symlink(),
            "Symlinks are not followed during revision inspection"
        );
    }
    let actual = current.canonicalize()?;
    ensure!(
        actual.starts_with(root),
        "File is outside the authorized revision root"
    );
    Ok(actual)
}

pub fn lines(text: &str) -> Vec<(usize, usize)> {
    let mut start = 0;
    let mut result = Vec::new();
    for line in text.split_inclusive('\n') {
        result.push((start, start + line.len()));
        start += line.len();
    }
    if result.is_empty() {
        result.push((0, 0));
    }
    result
}
pub fn line_range(text: &str, start_line: usize, end_line: usize) -> Result<(usize, usize)> {
    let ranges = lines(text);
    ensure!(
        start_line > 0 && end_line >= start_line && end_line <= ranges.len(),
        "Choose an existing line range"
    );
    Ok((ranges[start_line - 1].0, ranges[end_line - 1].1))
}

impl Feedback {
    pub fn new(root: &Path, files: Vec<ReviewFile>) -> Self {
        Self {
            format: "review.feedback".into(),
            version: 1,
            review_id: id(),
            created_at: now(),
            saved_at: 0,
            source_root_hint: root.display().to_string(),
            files,
            comments: vec![],
        }
    }
    pub fn target(
        &self,
        file_id: &str,
        snapshot_id: &str,
        start: usize,
        end: usize,
    ) -> Result<Target> {
        let file = self
            .files
            .iter()
            .find(|f| f.id == file_id)
            .context("Unknown selected file")?;
        let snapshot = file
            .snapshots
            .iter()
            .find(|s| s.id == snapshot_id)
            .context("Unknown reviewed snapshot")?;
        let text = &snapshot.text;
        ensure!(
            start <= end
                && end <= text.len()
                && text.is_char_boundary(start)
                && text.is_char_boundary(end),
            "Target must be a valid UTF-8 byte range in the reviewed snapshot"
        );
        ensure!(start < end || text.is_empty(), "Select some content");
        let before_start = text[..start]
            .char_indices()
            .rev()
            .nth(79)
            .map(|(i, _)| i)
            .unwrap_or(0);
        let after_end = text[end..]
            .char_indices()
            .nth(80)
            .map(|(i, _)| end + i)
            .unwrap_or(text.len());
        Ok(Target {
            file_id: file.id.clone(),
            path: file.path.clone(),
            snapshot_id: snapshot.id.clone(),
            side: snapshot.side.clone(),
            start_byte: start,
            end_byte: end,
            start_line: text[..start].bytes().filter(|b| *b == b'\n').count() + 1,
            end_line: text.as_bytes()[..if end > start { end - 1 } else { end }]
                .iter()
                .filter(|b| **b == b'\n')
                .count()
                + 1,
            quote: text[start..end].into(),
            before: text[before_start..start].into(),
            after: text[end..after_end].into(),
        })
    }
    pub fn validate(&self) -> Result<()> {
        ensure!(
            self.format == "review.feedback" && self.version == 1,
            "Unsupported feedback format or version"
        );
        ensure!(
            !self.files.is_empty() && self.files.len() <= 256,
            "Feedback must contain 1–256 files"
        );
        let mut ids = HashSet::new();
        let mut paths = HashSet::new();
        let mut bytes = 0;
        for file in &self.files {
            safe_relative(&file.path)?;
            ensure!(
                !file.id.is_empty() && ids.insert(&file.id) && paths.insert(&file.path),
                "Duplicate or empty file identifier/path"
            );
            ensure!(
                !file.snapshots.is_empty() && file.snapshots.len() <= 2,
                "Invalid snapshot count"
            );
            let mut sides = HashSet::new();
            for s in &file.snapshots {
                ensure!(
                    !s.id.is_empty() && ids.insert(&s.id) && sides.insert(format!("{:?}", s.side)),
                    "Duplicate or empty snapshot identifier/side"
                );
                ensure!(
                    s.text.len() <= MAX_TEXT && !s.text.contains('\0') && hash(&s.text) == s.sha256,
                    "Snapshot content or checksum is invalid"
                );
                bytes += s.text.len();
            }
            ensure!(bytes <= MAX_SESSION, "Selected content exceeds 16 MiB");
            if let Some(rows) = &file.diff {
                ensure!(
                    !file.snapshots.iter().any(|s| s.side == Side::Source),
                    "Diff cannot have a source side"
                );
                validate_rows(file, rows)?;
            } else {
                ensure!(
                    file.snapshots.len() == 1 && file.snapshots[0].side == Side::Source,
                    "Source review requires one source snapshot"
                );
            }
        }
        ensure!(self.comments.len() <= 10000, "Too many comments");
        for c in &self.comments {
            ensure!(
                !c.id.is_empty() && ids.insert(&c.id),
                "Duplicate or empty comment identifier"
            );
            validate_body(&c.body)?;
            ensure!(
                self.target(
                    &c.target.file_id,
                    &c.target.snapshot_id,
                    c.target.start_byte,
                    c.target.end_byte
                )? == c.target,
                "Comment context does not match its reviewed snapshot"
            );
        }
        Ok(())
    }
}

fn validate_rows(file: &ReviewFile, rows: &[DiffRow]) -> Result<()> {
    let old = file
        .snapshots
        .iter()
        .find(|s| s.side == Side::Old)
        .map(|s| (s, lines(&s.text)));
    let new = file
        .snapshots
        .iter()
        .find(|s| s.side == Side::New)
        .map(|s| (s, lines(&s.text)));
    for row in rows {
        ensure!(
            matches!(
                row.kind.as_str(),
                "hunk" | "context" | "delete" | "add" | "note"
            ),
            "Unknown diff row kind"
        );
        for (side, line) in [(Side::Old, row.old_line), (Side::New, row.new_line)] {
            if let Some(line) = line {
                let (s, ranges) = if side == Side::Old {
                    old.as_ref()
                } else {
                    new.as_ref()
                }
                .context("Diff row refers to missing side")?;
                ensure!(
                    line > 0 && line <= ranges.len(),
                    "Diff line is outside its snapshot"
                );
                let (a, b) = ranges[line - 1];
                ensure!(
                    s.text[a..b].trim_end_matches('\n') == row.text,
                    "Diff line does not match snapshot"
                );
            }
        }
        ensure!(
            match row.kind.as_str() {
                "context" => row.old_line.is_some() && row.new_line.is_some(),
                "delete" => row.old_line.is_some() && row.new_line.is_none(),
                "add" => row.new_line.is_some() && row.old_line.is_none(),
                _ => row.old_line.is_none() && row.new_line.is_none(),
            },
            "Diff side mapping is invalid"
        );
    }
    Ok(())
}
pub fn validate_body(body: &str) -> Result<()> {
    ensure!(
        !body.trim().is_empty() && body.len() <= MAX_COMMENT,
        "Comment must contain text and be at most 32 KiB"
    );
    Ok(())
}

impl Session {
    pub fn open(paths: &[PathBuf], output: PathBuf) -> Result<Self> {
        ensure!(
            !paths.is_empty() && paths.len() <= 256,
            "Select 1–256 files"
        );
        let mut selected = Vec::new();
        for path in paths {
            selected.push(
                path.canonicalize()
                    .with_context(|| format!("Cannot find {}", path.display()))?,
            );
        }
        let cwd = std::env::current_dir()?.canonicalize()?;
        let mut root = if selected.iter().all(|p| p.starts_with(&cwd)) {
            cwd
        } else {
            selected[0]
                .parent()
                .context("File has no parent")?
                .to_path_buf()
        };
        while !selected.iter().all(|p| p.starts_with(&root)) {
            ensure!(root.pop(), "No common file root");
        }
        let mut files = Vec::new();
        for path in selected {
            let name = path
                .strip_prefix(&root)?
                .to_str()
                .context("File paths must be UTF-8")?
                .to_string();
            files.push(ReviewFile {
                id: id(),
                path: name,
                snapshots: vec![Snapshot::new(
                    Side::Source,
                    "opened file".into(),
                    read_text(&path)?,
                )],
                diff: None,
            });
        }
        Self::from_feedback(Feedback::new(&root, files), Some(root), output, true)
    }
    pub fn from_feedback(
        feedback: Feedback,
        root: Option<PathBuf>,
        output: PathBuf,
        dirty: bool,
    ) -> Result<Self> {
        feedback.validate()?;
        let root = root.map(|r| r.canonicalize()).transpose()?;
        if let Some(r) = &root {
            ensure!(r.is_dir(), "Revision root must be a directory");
        }
        let output = if output.is_absolute() {
            output
        } else {
            std::env::current_dir()?.join(output)
        };
        let mut s = Self {
            feedback,
            root,
            output,
            revision: 0,
            dirty,
            last_saved: None,
            revisions: vec![],
        };
        s.refresh();
        Ok(s)
    }
    pub fn reopen(path: &Path, root: Option<PathBuf>, output: PathBuf) -> Result<Self> {
        let feedback: Feedback = serde_json::from_slice(&read_bounded(path, MAX_FEEDBACK)?)
            .context("Invalid feedback JSON")?;
        let mut s = Self::from_feedback(feedback, root, output, false)?;
        s.last_saved = Some(if path.is_absolute() {
            path.to_path_buf()
        } else {
            std::env::current_dir()?.join(path)
        });
        Ok(s)
    }
    pub fn add(
        &mut self,
        file: &str,
        snapshot: &str,
        start: usize,
        end: usize,
        body: String,
    ) -> Result<String> {
        validate_body(&body)?;
        ensure!(self.feedback.comments.len() < 10000, "Too many comments");
        let target = self.feedback.target(file, snapshot, start, end)?;
        let id = id();
        self.feedback.comments.push(Comment {
            id: id.clone(),
            target,
            body,
            created_at: now(),
            updated_at: now(),
        });
        self.changed();
        Ok(id)
    }
    pub fn edit(&mut self, id: &str, body: String) -> Result<()> {
        validate_body(&body)?;
        let c = self
            .feedback
            .comments
            .iter_mut()
            .find(|c| c.id == id)
            .context("Unknown comment")?;
        c.body = body;
        c.updated_at = now();
        self.changed();
        Ok(())
    }
    pub fn delete(&mut self, id: &str) -> Result<()> {
        let i = self
            .feedback
            .comments
            .iter()
            .position(|c| c.id == id)
            .context("Unknown comment")?;
        self.feedback.comments.remove(i);
        self.changed();
        Ok(())
    }
    fn changed(&mut self) {
        self.revision += 1;
        self.dirty = true;
    }
    pub fn refresh(&mut self) {
        self.revisions = self.feedback.files.iter().map(|f| {
            let base = f.snapshots.iter().find(|s| s.side == Side::Source || s.side == Side::New);
            let mut r = Revision { file_id: f.id.clone(), state: "detached".into(), message: "Snapshots only. Reopen with --root DIR to inspect revisions.".into(), text: None, diff: vec![] };
            if let Some(root) = &self.root {
                match selected_path(root, &f.path).and_then(|p| read_text(&p)) {
                    Ok(text) => {
                        let original = base.map(|s| s.text.as_str()).unwrap_or("");
                        r.state = if base.is_some() && text == original { "unchanged" } else { "changed" }.into();
                        r.message = if r.state == "changed" { "Disk content changed. Comments still refer to the reviewed snapshot." } else { "Disk content matches the reviewed snapshot." }.into();
                        if r.state == "changed" {
                            if let Some(previous) = self.revisions.iter().find(|r| r.file_id == f.id && r.text.as_ref() == Some(&text)) { return previous.clone(); }
                            match crate::git::unified(original, &text) { Ok(rows) => { r.diff = rows; r.text = Some(text); }, Err(e) => { r.message = format!("Changed; comparison unavailable: {e}"); r.text = Some(text); } }
                        }
                    },
                    Err(e) => { r.state = if !root.join(&f.path).exists() { "missing" } else { "unavailable" }.into(); r.message = format!("{}: {e}", f.path); },
                }
            }
            r
        }).collect();
    }
    pub fn save(&mut self) -> Result<PathBuf> {
        self.feedback.validate()?;
        let mut saved = self.feedback.clone();
        saved.saved_at = now();
        let mut data = serde_json::to_vec_pretty(&saved)?;
        data.push(b'\n');
        ensure!(data.len() <= MAX_FEEDBACK, "Feedback exceeds 64 MiB");
        let parent = self
            .output
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."));
        ensure!(
            parent.is_dir(),
            "Save directory does not exist: {}",
            parent.display()
        );
        let filename = self
            .output
            .file_name()
            .context("Choose a feedback filename")?
            .to_string_lossy();
        for number in 0..10000 {
            let dest = if number == 0 {
                self.output.clone()
            } else {
                parent.join(format!("{filename}.{number}.json"))
            };
            let mut temp = tempfile::NamedTempFile::new_in(parent)?;
            temp.write_all(&data)?;
            temp.as_file().sync_all()?;
            match temp.persist_noclobber(&dest) {
                Ok(_) => {
                    fs::File::open(parent)?.sync_all()?;
                    self.feedback.saved_at = saved.saved_at;
                    self.last_saved = Some(dest.clone());
                    self.dirty = false;
                    return Ok(dest);
                }
                Err(e) if e.error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) => bail!("Cannot save {}: {}", dest.display(), e.error),
            }
        }
        bail!("No available feedback filename; choose another output")
    }
    pub fn view(&self) -> View {
        View {
            feedback: self.feedback.clone(),
            revisions: self.revisions.clone(),
            revision: self.revision,
            dirty: self.dirty,
            output: self.output.display().to_string(),
            last_saved: self.last_saved.as_ref().map(|p| p.display().to_string()),
            previews: self
                .feedback
                .files
                .iter()
                .filter(|f| f.path.ends_with(".md") || f.path.ends_with(".markdown"))
                .flat_map(|f| f.snapshots.iter())
                .map(|s| Preview {
                    snapshot_id: s.id.clone(),
                    html: markdown(&s.text),
                })
                .collect(),
        }
    }
}

pub fn markdown(text: &str) -> String {
    use pulldown_cmark::{Event, Parser, Tag, TagEnd, html};
    let events = Parser::new(text).filter_map(|e| match e {
        Event::Html(s) | Event::InlineHtml(s) => Some(Event::Text(s)),
        Event::Start(Tag::Link { .. } | Tag::Image { .. })
        | Event::End(TagEnd::Link | TagEnd::Image) => None,
        other => Some(other),
    });
    let mut result = String::new();
    html::push_html(&mut result, events);
    result
}
