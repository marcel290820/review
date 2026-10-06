//! Builds a review from a Git comparison, using only read-only Git commands.

use crate::{
    feedback::{Feedback, MAX_FILES, MAX_TEXT, ReviewFile, Side, Snapshot, check_relative},
    files::{read_below, text_from_bytes},
    session::Session,
};
use anyhow::{Context, Result, bail, ensure};
use std::{
    path::{Path, PathBuf},
    process::Command,
};

/// File modes of regular, non-symlink blobs.
const REGULAR_MODES: [&str; 2] = ["100644", "100755"];

/// What the base revision is compared with.
pub enum Head {
    WorkTree,
    Index,
    Commit(String),
}

/// Opens the changes between `base` and `head`, optionally limited by Git pathspecs
/// relative to the repository root.
pub fn open(
    repo: &Path,
    base: &str,
    head: &Head,
    pathspecs: &[PathBuf],
    output: PathBuf,
) -> Result<Session> {
    let repo = Repo::discover(repo)?;
    let base = repo.commit(base)?;
    let head = match head {
        Head::WorkTree => Head::WorkTree,
        Head::Index => Head::Index,
        Head::Commit(revision) => Head::Commit(repo.commit(revision)?),
    };
    let mut args = vec![
        "diff",
        "--name-only",
        "-z",
        "--no-renames",
        "--no-ext-diff",
        "--no-textconv",
    ];
    if matches!(head, Head::Index) {
        args.push("--cached");
    }
    args.push(&base);
    if let Head::Commit(commit) = &head {
        args.push(commit);
    }
    args.push("--");
    for pathspec in pathspecs {
        args.push(pathspec.to_str().context("Path filters must be UTF-8")?);
    }
    let listing = repo.git(&args)?;
    let paths = listing
        .split(|&b| b == 0)
        .filter(|name| !name.is_empty())
        .map(|name| std::str::from_utf8(name).context("Changed paths must be UTF-8"))
        .collect::<Result<Vec<_>>>()?;
    ensure!(
        !paths.is_empty(),
        "No text changes to review. Untracked files can be opened directly."
    );
    ensure!(
        paths.len() <= MAX_FILES,
        "{} changed files exceed the {MAX_FILES} file limit; narrow the comparison with path filters",
        paths.len()
    );
    let new_revision = match &head {
        Head::WorkTree => "working tree",
        Head::Index => "index",
        Head::Commit(commit) => commit,
    };
    let mut files = Vec::new();
    for path in paths {
        check_relative(path)?;
        let old = repo.tree_text(&base, path)?;
        let new = match &head {
            Head::WorkTree => read_below(&repo.root, path)?,
            Head::Index => repo.index_text(path)?,
            Head::Commit(commit) => repo.tree_text(commit, path)?,
        };
        let snapshots: Vec<_> = [
            old.map(|text| Snapshot::new(Side::Old, &base, text)),
            new.map(|text| Snapshot::new(Side::New, new_revision, text)),
        ]
        .into_iter()
        .flatten()
        .collect();
        ensure!(
            !snapshots.is_empty(),
            "{path} disappeared during the comparison; retry"
        );
        files.push(ReviewFile::new(path.into(), snapshots));
    }
    let root = repo.root;
    Session::new(Feedback::new(&root, files), Some(root), output)
}

struct Repo {
    root: PathBuf,
}

impl Repo {
    fn discover(directory: &Path) -> Result<Self> {
        let output = String::from_utf8(git(directory, &["rev-parse", "--show-toplevel"])?)
            .context("The repository path must be UTF-8")?;
        let root = output
            .strip_suffix('\n')
            .context("Unexpected output from git rev-parse")?;
        Ok(Self {
            root: Path::new(root).canonicalize()?,
        })
    }

    fn git(&self, args: &[&str]) -> Result<Vec<u8>> {
        git(&self.root, args)
    }

    /// Resolves a user-supplied revision to a commit ID.
    fn commit(&self, revision: &str) -> Result<String> {
        // A leading '-' would be parsed as an option.
        ensure!(
            !revision.is_empty() && !revision.starts_with('-'),
            "Invalid Git revision: {revision:?}"
        );
        let id = self.git(&["rev-parse", "--verify", &format!("{revision}^{{commit}}")])?;
        Ok(String::from_utf8(id)?.trim().into())
    }

    /// The text of `path` in `commit`, or `None` when the commit does not contain it.
    fn tree_text(&self, commit: &str, path: &str) -> Result<Option<String>> {
        let listing = self.git(&["--literal-pathspecs", "ls-tree", "-z", commit, "--", path])?;
        // Entries are "<mode> <type> <object>\t<path>".
        match entries(&listing)?[..] {
            [] => Ok(None),
            [(metadata, name)] if name == path => match metadata.split(' ').collect::<Vec<_>>()[..]
            {
                [mode, "blob", object] if REGULAR_MODES.contains(&mode) => {
                    self.blob_text(object).map(Some)
                }
                _ => bail!("Only regular text files can be compared: {path}"),
            },
            _ => bail!("Unexpected Git tree entry for {path}"),
        }
    }

    /// The staged text of `path`, or `None` when the index does not contain it.
    fn index_text(&self, path: &str) -> Result<Option<String>> {
        let listing = self.git(&[
            "--literal-pathspecs",
            "ls-files",
            "--stage",
            "-z",
            "--",
            path,
        ])?;
        // Entries are "<mode> <object> <stage>\t<path>"; a conflict has one entry per stage.
        match entries(&listing)?[..] {
            [] => Ok(None),
            [(metadata, name)] if name == path => match metadata.split(' ').collect::<Vec<_>>()[..]
            {
                [mode, object, "0"] if REGULAR_MODES.contains(&mode) => {
                    self.blob_text(object).map(Some)
                }
                _ => bail!("Only regular, merged text files can be compared: {path}"),
            },
            _ => bail!("{path} has merge conflicts; resolve them before reviewing"),
        }
    }

    fn blob_text(&self, object: &str) -> Result<String> {
        let size: usize = String::from_utf8(self.git(&["cat-file", "-s", object])?)?
            .trim()
            .parse()?;
        ensure!(
            size <= MAX_TEXT,
            "Git object {object} exceeds the 2 MiB text limit"
        );
        text_from_bytes(self.git(&["cat-file", "blob", object])?)
    }
}

/// Runs Git in `directory` without pagers, external diff or text conversion drivers,
/// file system monitors, or optional lock files, so it executes no repository-configured
/// programs and leaves the repository unchanged.
fn git(directory: &Path, args: &[&str]) -> Result<Vec<u8>> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-c",
            "core.fsmonitor=false",
            "-c",
            "core.untrackedCache=false",
            "-C",
        ])
        .arg(directory)
        .args(args)
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .context("Git is required for diff comparisons; install Git or open files directly")?;
    ensure!(
        output.status.success(),
        "Git failed: {}",
        String::from_utf8_lossy(&output.stderr).trim()
    );
    Ok(output.stdout)
}

/// Splits `-z` listing output into `(metadata, path)` entries.
fn entries(listing: &[u8]) -> Result<Vec<(&str, &str)>> {
    listing
        .split(|&b| b == 0)
        .filter(|entry| !entry.is_empty())
        .map(|entry| {
            std::str::from_utf8(entry)?
                .split_once('\t')
                .context("Unexpected Git listing")
        })
        .collect()
}
