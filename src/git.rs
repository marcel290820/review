use crate::core::{
    Feedback, MAX_TEXT, ReviewFile, Session, Side, Snapshot, id, read_text, safe_relative,
    selected_path, text_bytes,
};
use anyhow::{Context, Result, ensure};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};

fn git(root: &Path, args: &[&str]) -> Result<Output> {
    Command::new("git")
        .arg("--no-pager")
        .args([
            "-c",
            "core.fsmonitor=false",
            "-c",
            "core.untrackedCache=false",
            "-C",
        ])
        .arg(root)
        .args(args)
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .context("Git is required for diff comparisons; install Git or open ordinary files")
}
fn checked(root: &Path, args: &[&str]) -> Result<Vec<u8>> {
    let output = git(root, args)?;
    ensure!(
        output.status.success(),
        "Git failed: {}",
        String::from_utf8_lossy(&output.stderr).trim()
    );
    Ok(output.stdout)
}
fn revision(root: &Path, input: &str) -> Result<String> {
    ensure!(
        !input.starts_with('-') && !input.is_empty(),
        "Invalid Git revision"
    );
    Ok(String::from_utf8(checked(
        root,
        &["rev-parse", "--verify", &format!("{input}^{{commit}}")],
    )?)?
    .trim()
    .into())
}
fn blob(root: &Path, rev: &str, path: &str) -> Result<Option<String>> {
    let listing = checked(
        root,
        &["--literal-pathspecs", "ls-tree", "-z", rev, "--", path],
    )?;
    if listing.is_empty() {
        return Ok(None);
    }
    let item = std::str::from_utf8(&listing)?.trim_end_matches('\0');
    let (metadata, name) = item.split_once('\t').context("Invalid Git tree entry")?;
    ensure!(name == path, "Ambiguous Git path");
    let parts: Vec<_> = metadata.split_whitespace().collect();
    ensure!(
        parts.len() == 3 && matches!(parts[0], "100644" | "100755") && parts[1] == "blob",
        "Only ordinary text files are supported: {path}"
    );
    Ok(Some(read_blob(root, parts[2])?))
}
fn index_blob(root: &Path, path: &str) -> Result<Option<String>> {
    let listing = checked(
        root,
        &[
            "--literal-pathspecs",
            "ls-files",
            "--stage",
            "-z",
            "--",
            path,
        ],
    )?;
    if listing.is_empty() {
        return Ok(None);
    }
    let entries: Vec<_> = listing
        .split(|b| *b == 0)
        .filter(|s| !s.is_empty())
        .collect();
    ensure!(entries.len() == 1, "Unmerged index file: {path}");
    let (meta, name) = std::str::from_utf8(entries[0])?
        .split_once('\t')
        .context("Invalid index entry")?;
    let parts: Vec<_> = meta.split_whitespace().collect();
    ensure!(
        name == path
            && parts.len() == 3
            && parts[2] == "0"
            && matches!(parts[0], "100644" | "100755"),
        "Only ordinary, merged index files are supported: {path}"
    );
    Ok(Some(read_blob(root, parts[1])?))
}
fn read_blob(root: &Path, object: &str) -> Result<String> {
    let size: usize = std::str::from_utf8(&checked(root, &["cat-file", "-s", object])?)?
        .trim()
        .parse()?;
    ensure!(size <= MAX_TEXT, "Git blob exceeds 2 MiB");
    text_bytes(checked(root, &["cat-file", "blob", object])?)
}

pub fn open(
    repo: &Path,
    base: &str,
    head: Option<&str>,
    staged: bool,
    paths: &[PathBuf],
    output: PathBuf,
) -> Result<Session> {
    let root = PathBuf::from(
        String::from_utf8(checked(repo, &["rev-parse", "--show-toplevel"])?)?
            .strip_suffix('\n')
            .context("Git repository path is missing its terminator")?,
    )
    .canonicalize()?;
    let base = revision(&root, base)?;
    let head = head.map(|h| revision(&root, h)).transpose()?;
    ensure!(
        !(staged && head.is_some()),
        "Choose staged changes or a head revision"
    );
    let mut args = vec![
        "diff",
        "--name-only",
        "-z",
        "--no-renames",
        "--no-ext-diff",
        "--no-textconv",
        &base,
    ];
    if staged {
        args.push("--cached");
    }
    if let Some(h) = &head {
        args.push(h);
    }
    args.push("--");
    let filters: Vec<_> = paths
        .iter()
        .map(|p| p.to_str().context("File paths must be UTF-8"))
        .collect::<Result<_>>()?;
    args.extend(filters);
    let names = checked(&root, &args)?;
    let mut files = Vec::new();
    for name in names.split(|b| *b == 0).filter(|s| !s.is_empty()) {
        let path = std::str::from_utf8(name)?.to_string();
        safe_relative(&path)?;
        let old = blob(&root, &base, &path)?;
        let new = if let Some(h) = &head {
            blob(&root, h, &path)?
        } else if staged {
            index_blob(&root, &path)?
        } else {
            if fs::symlink_metadata(root.join(&path))
                .is_err_and(|e| e.kind() == std::io::ErrorKind::NotFound)
            {
                None
            } else {
                Some(read_text(&selected_path(&root, &path)?)?)
            }
        };
        let mut snapshots = Vec::new();
        if let Some(text) = old {
            snapshots.push(Snapshot::new(Side::Old, base.clone(), text));
        }
        if let Some(text) = new {
            snapshots.push(Snapshot::new(
                Side::New,
                head.clone().unwrap_or_else(|| {
                    if staged {
                        "index".into()
                    } else {
                        "working tree".into()
                    }
                }),
                text,
            ));
        }
        ensure!(
            !snapshots.is_empty(),
            "Git path disappeared during review: {path}; retry"
        );
        files.push(ReviewFile {
            id: id(),
            path,
            snapshots,
        });
    }
    ensure!(
        !files.is_empty(),
        "No text changes to review. Untracked files can be opened directly."
    );
    Session::from_feedback(Feedback::new(&root, files), Some(root), output, true)
}
