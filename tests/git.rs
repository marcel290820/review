use review::{
    diff::DiffKind,
    feedback::{ReviewFile, Side, line_range},
    git::{self, Head},
    session::Session,
};
use std::{fs, path::Path, process::Command};

fn run(root: &Path, args: &[&str]) {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .unwrap();
    assert!(output.status.success(), "{args:?}: {output:?}");
}

fn repository() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    run(dir.path(), &["init", "-q"]);
    run(dir.path(), &["config", "user.name", "Local test"]);
    run(
        dir.path(),
        &["config", "user.email", "test@example.invalid"],
    );
    dir
}

fn text(file: &ReviewFile, side: Side) -> &str {
    &file.snapshot(side).unwrap().text
}

#[test]
fn returned_paths_are_loaded_literally() {
    let dir = repository();
    let root = dir.path();
    let names = [
        "literal[1]*?.txt",
        "literal1xy.txt",
        "line\nbreak.md",
        ":colon.txt",
    ];
    for name in names {
        fs::write(root.join(name), format!("old {name}\n")).unwrap();
    }
    run(root, &["add", "."]);
    run(root, &["commit", "-qm", "fixture"]);
    for name in names {
        fs::write(root.join(name), format!("new {name}\n")).unwrap();
    }
    run(root, &["add", "."]);
    for head in [Head::WorkTree, Head::Index] {
        let session = git::open(root, "HEAD", &head, &[], root.join("feedback.json")).unwrap();
        assert_eq!(session.files().len(), names.len());
        for file in session.files() {
            assert_eq!(text(file, Side::Old), format!("old {}\n", file.path));
            assert_eq!(text(file, Side::New), format!("new {}\n", file.path));
        }
    }
}

#[test]
fn work_tree_index_and_commits_give_reliable_sides() {
    let dir = repository();
    let root = dir.path();
    let original: String = (1..=30).map(|n| format!("line {n}\n")).collect();
    fs::write(root.join("a name\t🦀.txt"), &original).unwrap();
    fs::write(root.join("deleted.txt"), "old file").unwrap();
    run(root, &["add", "."]);
    run(root, &["commit", "-qm", "fixture"]);
    let changed = original
        .replace("line 2\n", "new second\n")
        .replace("line 25\n", "new twenty-five\n");
    fs::write(root.join("a name\t🦀.txt"), &changed).unwrap();
    fs::remove_file(root.join("deleted.txt")).unwrap();
    fs::write(root.join("added.txt"), "added 🦀").unwrap();
    run(root, &["add", "."]);
    let output = root.join("feedback.json");

    let mut session = git::open(root, "HEAD", &Head::WorkTree, &[], output.clone()).unwrap();
    assert_eq!(session.files().len(), 3);
    let index = session
        .files()
        .iter()
        .position(|f| f.path.starts_with("a name"))
        .unwrap();
    let hunks = session.diff(index).unwrap();
    assert_eq!(hunks.iter().filter(|r| r.kind == DiffKind::Hunk).count(), 2);
    let file = &session.files()[index];
    let file_id = file.id.clone();
    let old = file.snapshot(Side::Old).unwrap().id.clone();
    let new = file.snapshot(Side::New).unwrap().id.clone();
    let deleted = session
        .files()
        .iter()
        .find(|f| f.path == "deleted.txt")
        .unwrap();
    assert!(deleted.snapshot(Side::New).is_none());
    let added = session
        .files()
        .iter()
        .find(|f| f.path == "added.txt")
        .unwrap();
    assert!(added.snapshot(Side::Old).is_none());

    let bytes = line_range(&original, 2, 2).unwrap();
    session
        .add_comment(&file_id, &old, bytes, "Keep old context".into())
        .unwrap();
    let bytes = line_range(&changed, 2, 2).unwrap();
    session
        .add_comment(&file_id, &new, bytes, "Fix new side".into())
        .unwrap();
    let saved = session.save().unwrap();
    let reopened = Session::reopen(&saved, Some(root.into()), output.clone()).unwrap();
    assert_eq!(reopened.comments()[0].target.side, Side::Old);
    assert_eq!(reopened.comments()[0].target.quote, "line 2\n");
    assert_eq!(reopened.comments()[1].target.quote, "new second\n");

    fs::write(root.join("added.txt"), "unstaged").unwrap();
    let staged = git::open(root, "HEAD", &Head::Index, &[], output.clone()).unwrap();
    let added = staged
        .files()
        .iter()
        .find(|f| f.path == "added.txt")
        .unwrap();
    assert_eq!(text(added, Side::New), "added 🦀");

    let filtered = git::open(
        root,
        "HEAD",
        &Head::WorkTree,
        &["deleted.txt".into()],
        output.clone(),
    )
    .unwrap();
    assert_eq!(filtered.files().len(), 1);

    run(root, &["commit", "-qm", "revision"]);
    let commits = git::open(
        root,
        "HEAD~1",
        &Head::Commit("HEAD".into()),
        &[],
        output.clone(),
    )
    .unwrap();
    assert_eq!(commits.files().len(), 3);
    assert!(git::open(root, "--help", &Head::WorkTree, &[], output.clone()).is_err());
    let unchanged = git::open(root, "HEAD", &Head::Index, &[], output);
    assert!(unchanged.is_err(), "nothing staged since the last commit");
}

#[cfg(unix)]
#[test]
fn symlinks_are_errors_rather_than_guessed_targets() {
    let dir = repository();
    let root = dir.path();
    fs::write(root.join("target.txt"), "text\n").unwrap();
    std::os::unix::fs::symlink("target.txt", root.join("link")).unwrap();
    run(root, &["add", "."]);
    run(root, &["commit", "-qm", "fixture"]);
    fs::remove_file(root.join("link")).unwrap();
    std::os::unix::fs::symlink("elsewhere.txt", root.join("link")).unwrap();
    let error = git::open(root, "HEAD", &Head::WorkTree, &[], root.join("out.json"))
        .err()
        .unwrap();
    assert!(
        error.to_string().contains("Only regular text files"),
        "{error}"
    );
}
