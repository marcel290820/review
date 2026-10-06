//! Bounded text reads, symlink-free resolution below a root, and saves that never replace files.

use crate::feedback::{MAX_TEXT, check_relative};
use anyhow::{Context, Result, bail, ensure};
use std::{
    fs::{self, File},
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
    // Check before opening: opening a FIFO for reading blocks until a writer appears.
    let metadata = fs::metadata(path).with_context(|| format!("Cannot open {}", path.display()))?;
    ensure!(
        metadata.is_file(),
        "{} is not a regular file",
        path.display()
    );
    let file = File::open(path).with_context(|| format!("Cannot open {}", path.display()))?;
    let mut data = Vec::new();
    file.take(limit as u64 + 1).read_to_end(&mut data)?;
    ensure!(
        data.len() <= limit,
        "{} exceeds the {limit} byte limit",
        path.display()
    );
    Ok(data)
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

/// Publishes `data` at `output`, or at `output.N.json` for the first free N.
/// Never replaces an existing file or symlink; returns the path written.
pub fn save_new(output: &Path, data: &[u8]) -> Result<PathBuf> {
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
            Ok(_) => {
                #[cfg(unix)]
                File::open(directory)?.sync_all()?;
                return Ok(destination);
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
