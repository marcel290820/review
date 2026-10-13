//! Bounded text reads, symlink-free resolution below a root, and saves that replace only the
//! session's own feedback file.

use crate::feedback::{MAX_FEEDBACK, MAX_TEXT, check_relative};
use anyhow::{Context, Result, bail, ensure};
use std::{
    env,
    fs::{self, File},
    hash::{DefaultHasher, Hash, Hasher},
    io::{ErrorKind, Read, Write},
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;

/// Numbered alternatives tried when the requested feedback filename exists.
const MAX_SAVE_ATTEMPTS: usize = 10_000;

/// Reads a regular UTF-8 text file of at most [`MAX_TEXT`] bytes.
pub fn read_text(path: &Path) -> Result<String> {
    text_from_bytes(read_bounded(path, MAX_TEXT)?)
}

pub fn read_bounded(path: &Path, limit: usize) -> Result<Vec<u8>> {
    open_bounded(path, limit).map(|(_, data)| data)
}

/// Reads a regular file of at most `limit` bytes, with what identifies its contents.
pub fn read_held(path: &Path, limit: usize) -> Result<(Vec<u8>, Held)> {
    let (file, data) = open_bounded(path, limit)?;
    let held = Held::of(&file, &data)?;
    Ok((data, held))
}

fn open_bounded(path: &Path, limit: usize) -> Result<(File, Vec<u8>)> {
    // Check before opening: opening a FIFO for reading blocks until a writer appears.
    let metadata = fs::metadata(path).with_context(|| format!("Cannot open {}", path.display()))?;
    ensure!(
        metadata.is_file(),
        "{} is not a regular file",
        path.display()
    );
    let file = File::open(path).with_context(|| format!("Cannot open {}", path.display()))?;
    let mut data = Vec::new();
    (&file).take(limit as u64 + 1).read_to_end(&mut data)?;
    ensure!(
        data.len() <= limit,
        "{} exceeds the {limit} byte limit",
        path.display()
    );
    Ok((file, data))
}

pub fn text_from_bytes(data: Vec<u8>) -> Result<String> {
    ensure!(!data.contains(&0), "Binary files are not supported");
    String::from_utf8(data).context("Only UTF-8 text is supported")
}

/// Reads `relative` below the canonical `root` without following symlinks below it;
/// `None` when nothing exists at that path.
pub fn read_below(root: &Path, relative: &str) -> Result<Option<String>> {
    check_relative(relative)?;
    let mut path = root.to_path_buf();
    for part in Path::new(relative).components() {
        path.push(part);
        let metadata = match fs::symlink_metadata(&path) {
            Err(e) if e.kind() == ErrorKind::NotFound => return Ok(None),
            other => other.with_context(|| format!("Cannot inspect {}", path.display()))?,
        };
        ensure!(
            !metadata.file_type().is_symlink(),
            "Symlinks are not followed: {}",
            path.display()
        );
    }
    // The root itself may have been replaced, for example by a symlink, since it was authorized.
    let resolved = path.canonicalize()?;
    ensure!(
        resolved.starts_with(root),
        "{} is outside the authorized directory",
        path.display()
    );
    read_text(&resolved).map(Some)
}

/// What a session last saw of its feedback file: the file itself and a digest of its bytes,
/// to notice that the file was replaced or changed since.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Held {
    file: (u64, u64),
    digest: u64,
}

impl Held {
    fn of(file: &File, bytes: &[u8]) -> Result<Self> {
        let mut hasher = DefaultHasher::new();
        bytes.hash(&mut hasher);
        Ok(Self {
            file: identity(&file.metadata()?),
            digest: hasher.finish(),
        })
    }
}

#[cfg(unix)]
fn identity(metadata: &fs::Metadata) -> (u64, u64) {
    use std::os::unix::fs::MetadataExt;
    (metadata.dev(), metadata.ino())
}

#[cfg(not(unix))]
fn identity(_metadata: &fs::Metadata) -> (u64, u64) {
    (0, 0)
}

/// Replaces `path` with `data` if it still is the file, not a symlink, that `held` describes,
/// and returns what describes the new one; otherwise writes nothing and returns `None`. Review sessions take
/// turns on an advisory lock on the directory, so of two saving the same file at once, the
/// second finds it changed. Other programs replacing files in the directory during a save are
/// out of scope.
#[cfg(unix)]
pub fn replace_held(path: &Path, held: Held, data: &[u8]) -> Result<Option<Held>> {
    let directory = path.parent().context("Choose a feedback filename")?;
    let mut temp = NamedTempFile::new_in(directory)?;
    temp.write_all(data)?;
    temp.as_file().sync_all()?;
    let lock = File::open(directory)?;
    if lock.lock().is_err() {
        return Ok(None);
    }
    // The type comes first: opening a FIFO to read it would block.
    let expected = fs::symlink_metadata(path).is_ok_and(|m| m.is_file())
        && read_held(path, MAX_FEEDBACK).is_ok_and(|(_, now)| now == held);
    if !expected {
        return Ok(None);
    }
    let file = temp
        .persist(path)
        .map_err(|e| anyhow::anyhow!("Cannot save {}: {}", path.display(), e.error))?;
    lock.sync_all()?;
    Held::of(&file, data).map(Some)
}

/// Without these file operations, every save takes a new file.
#[cfg(not(unix))]
pub fn replace_held(_path: &Path, _held: Held, _data: &[u8]) -> Result<Option<Held>> {
    Ok(None)
}

/// `path` as people read it: relative to the working directory when below it, otherwise below
/// the home directory as `~/…`, otherwise in full.
pub fn display(path: &Path) -> String {
    if let Some(relative) = env::current_dir()
        .ok()
        .and_then(|cwd| path.strip_prefix(cwd).ok().map(Path::to_path_buf))
        .filter(|relative| !relative.as_os_str().is_empty())
    {
        return relative.display().to_string();
    }
    match env::var_os("HOME").and_then(|home| path.strip_prefix(home).ok().map(Path::to_path_buf)) {
        Some(relative) => Path::new("~").join(relative).display().to_string(),
        None => path.display().to_string(),
    }
}

/// `path` is `output` or one of its numbered alternatives, `output.N.json`.
pub fn is_save_of(path: &Path, output: &Path) -> bool {
    let (Some(name), Some(base)) = (path.file_name(), output.file_name()) else {
        return false;
    };
    let numbered = name
        .to_str()
        .zip(base.to_str())
        .and_then(|(name, base)| {
            name.strip_prefix(base)?
                .strip_prefix('.')?
                .strip_suffix(".json")
        })
        .is_some_and(|n| !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()));
    path.parent() == output.parent() && (name == base || numbered)
}

/// Publishes `data` at `output`, or at `output.N.json` for the first free N.
/// Never replaces an existing file or symlink; returns the path written and what describes it.
pub fn save_new(output: &Path, data: &[u8]) -> Result<(PathBuf, Held)> {
    let name = output.file_name().context("Choose a feedback filename")?;
    let directory = match output.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };
    ensure!(
        directory.is_dir(),
        "Save directory does not exist: {}",
        directory.display()
    );
    let mut temp = NamedTempFile::new_in(directory)?;
    temp.write_all(data)?;
    temp.as_file().sync_all()?;
    for n in 0..MAX_SAVE_ATTEMPTS {
        let destination = if n == 0 {
            output.to_path_buf()
        } else {
            let mut numbered = name.to_os_string();
            numbered.push(format!(".{n}.json"));
            directory.join(numbered)
        };
        match temp.persist_noclobber(&destination) {
            Ok(file) => {
                #[cfg(unix)]
                File::open(directory)?.sync_all()?;
                return Ok((destination, Held::of(&file, data)?));
            }
            Err(e) if e.error.kind() == ErrorKind::AlreadyExists => temp = e.file,
            Err(e) => bail!("Cannot save {}: {}", destination.display(), e.error),
        }
    }
    bail!(
        "No free feedback filename next to {}; choose another --output",
        output.display()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_show_relative_to_the_working_directory() {
        let cwd = env::current_dir().unwrap();
        let below = Path::new("out").join("feedback.json");
        assert_eq!(display(&cwd.join(&below)), below.display().to_string());
        let elsewhere = Path::new("/nonexistent-review-root/feedback.json");
        assert_eq!(display(elsewhere), elsewhere.display().to_string());
    }
}
