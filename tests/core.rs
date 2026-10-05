use review::{
    core::{self, Feedback, MAX_TEXT, Session, Side},
    git,
};
use std::{fs, path::Path, process::Command};

fn setup(text: &str) -> (tempfile::TempDir, Session) {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("note.md"), text).unwrap();
    let session = Session::open(
        &[dir.path().join("note.md")],
        dir.path().join("feedback.json"),
    )
    .unwrap();
    (dir, session)
}
fn add_line(s: &mut Session, line: usize, body: &str) -> String {
    let f = &s.feedback.files[0];
    let snap = &f.snapshots[0];
    let (a, b) = core::line_range(&snap.text, line, line).unwrap();
    let (f, snap) = (f.id.clone(), snap.id.clone());
    s.add(&f, &snap, a, b, body.into()).unwrap()
}

#[test]
fn complete_loop_preserves_snapshot_context_and_saves_versions() {
    let (dir, mut s) = setup("# Plan\r\n\r\nKeep café 🦀 unchanged.\r\nLast line");
    let id = add_line(&mut s, 3, "Explain this\nAnd this");
    let original = s.feedback.comments[0].target.clone();
    assert_eq!(original.quote, "Keep café 🦀 unchanged.\r\n");
    s.edit(&id, "A revised request".into()).unwrap();
    let saved = s.save().unwrap();
    assert!(!s.dirty);
    let initial_bytes = fs::read(&saved).unwrap();
    fs::write(
        dir.path().join("note.md"),
        "Inserted line\n# Plan\nChanged passage\n",
    )
    .unwrap();
    let mut restored = Session::reopen(
        &saved,
        Some(dir.path().into()),
        dir.path().join("feedback.json"),
    )
    .unwrap();
    assert_eq!(restored.feedback.comments[0].target, original);
    assert_eq!(restored.revisions[0].state, "changed");
    assert!(
        restored.revisions[0]
            .diff
            .iter()
            .any(|r| r.kind == "add" && r.text == "Inserted line")
    );
    let second = restored.save().unwrap();
    assert_ne!(second, saved);
    assert_eq!(fs::read(saved).unwrap(), initial_bytes);
    restored.delete(&id).unwrap();
    assert!(restored.feedback.comments.is_empty());
    let detached = Session::reopen(&second, None, dir.path().join("elsewhere.json")).unwrap();
    assert_eq!(detached.revisions[0].state, "detached");
}

#[test]
fn byte_ranges_are_exact_for_unicode_newlines_and_empty_files() {
    let (_, s) = setup("é🦀\nlast\n");
    let f = &s.feedback.files[0];
    let snap = &f.snapshots[0];
    assert!(s.feedback.target(&f.id, &snap.id, 1, 2).is_err());
    let t = s.feedback.target(&f.id, &snap.id, 2, 6).unwrap();
    assert_eq!((t.quote.as_str(), t.start_line, t.end_line), ("🦀", 1, 1));
    assert!(s.feedback.target(&f.id, &snap.id, 0, 99).is_err());
    assert!(s.feedback.target(&f.id, &snap.id, 2, 2).is_err());
    assert_eq!(core::lines("a\n"), vec![(0, 2)]);
    let (_, s) = setup("");
    let f = &s.feedback.files[0];
    assert_eq!(
        s.feedback
            .target(&f.id, &f.snapshots[0].id, 0, 0)
            .unwrap()
            .quote,
        ""
    );
}

#[test]
fn reject_corrupt_unknown_or_misidentified_feedback() {
    let (_, mut s) = setup("alpha\nbeta\n");
    add_line(&mut s, 2, "Fix it");
    let value = serde_json::to_value(&s.feedback).unwrap();
    for mutate in [
        |v: &mut serde_json::Value| v["version"] = 2.into(),
        |v: &mut serde_json::Value| v["files"][0]["snapshots"][0]["text"] = "changed".into(),
        |v: &mut serde_json::Value| v["comments"][0]["target"]["quote"] = "wrong".into(),
        |v: &mut serde_json::Value| v["comments"][0]["target"]["side"] = "new".into(),
        |v: &mut serde_json::Value| v["files"][0]["path"] = "../escape".into(),
        |v: &mut serde_json::Value| v["files"][0]["path"] = "/absolute".into(),
        |v: &mut serde_json::Value| v["comments"][0]["target"]["end_byte"] = 999.into(),
    ] {
        let mut v = value.clone();
        mutate(&mut v);
        let f: Feedback = serde_json::from_value(v).unwrap();
        assert!(f.validate().is_err());
    }
    let mut unknown = value;
    unknown["unexpected"] = true.into();
    assert!(serde_json::from_value::<Feedback>(unknown).is_err());
    assert!(s.edit("nonexistent", "x".into()).is_err());
    assert!(
        s.edit(&s.feedback.comments[0].id.clone(), "  ".into())
            .is_err()
    );
}

#[test]
fn saves_preserve_unrelated_files_symlinks_and_failed_save_dirty_state() {
    let (dir, mut s) = setup("text\n");
    add_line(&mut s, 1, "request");
    let output = dir.path().join("feedback.json");
    fs::write(&output, "unrelated").unwrap();
    let saved = s.save().unwrap();
    assert_ne!(saved, output);
    assert_eq!(fs::read_to_string(&output).unwrap(), "unrelated");
    s.output = dir.path().join("absent/feedback.json");
    add_line(&mut s, 1, "second");
    assert!(s.save().is_err());
    assert!(s.dirty);
    #[cfg(unix)]
    {
        let output = dir.path().join("symlink.json");
        std::os::unix::fs::symlink(dir.path().join("note.md"), &output).unwrap();
        s.output = output;
        s.save().unwrap();
        assert_eq!(
            fs::read_to_string(dir.path().join("note.md")).unwrap(),
            "text\n"
        );
    }
}

#[test]
fn concurrent_saves_never_clobber() {
    let (dir, s) = setup("text");
    let feedback = s.feedback;
    let mut jobs = vec![];
    for _ in 0..8 {
        let f = feedback.clone();
        let out = dir.path().join("shared.json");
        jobs.push(std::thread::spawn(move || {
            Session::from_feedback(f, None, out, true)
                .unwrap()
                .save()
                .unwrap()
        }));
    }
    let saved: std::collections::HashSet<_> = jobs.into_iter().map(|j| j.join().unwrap()).collect();
    assert_eq!(saved.len(), 8);
    for path in saved {
        let f: Feedback = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        f.validate().unwrap();
    }
}

#[test]
fn changed_missing_and_symlinked_revisions_remain_explicit() {
    let (dir, mut s) = setup("reviewed");
    add_line(&mut s, 1, "Keep context");
    fs::remove_file(dir.path().join("note.md")).unwrap();
    s.refresh();
    assert_eq!(s.revisions[0].state, "missing");
    #[cfg(unix)]
    {
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("private"), "unselected").unwrap();
        std::os::unix::fs::symlink(outside.path().join("private"), dir.path().join("note.md"))
            .unwrap();
        s.refresh();
        assert_eq!(s.revisions[0].state, "unavailable");
        assert!(s.revisions[0].text.is_none());
    }
    assert_eq!(s.feedback.comments[0].target.quote, "reviewed");
}

#[test]
fn input_limits_binary_invalid_utf8_and_directories() {
    let dir = tempfile::tempdir().unwrap();
    for (name, bytes) in [
        ("binary", vec![0, 1]),
        ("encoding", vec![255]),
        ("large", vec![b'a'; MAX_TEXT + 1]),
    ] {
        let p = dir.path().join(name);
        fs::write(&p, bytes).unwrap();
        assert!(core::read_text(&p).is_err());
    }
    assert!(core::read_text(dir.path()).is_err());
}

#[test]
fn documented_example_reopens_and_matches_source() {
    let example = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples");
    let output = tempfile::tempdir().unwrap();
    let s = Session::reopen(
        &example.join("feedback.json"),
        Some(example),
        output.path().join("feedback.json"),
    )
    .unwrap();
    assert_eq!(s.revisions[0].state, "unchanged");
    assert_eq!(
        s.feedback.comments[0].target.quote,
        "Ship the local review loop.\n"
    );
}

#[test]
fn markdown_has_no_executable_html_or_external_resources() {
    let html = core::markdown(
        "# Heading\n<script>alert(1)</script>\n\n[x](javascript:evil) ![alt](https://example.invalid/img)\n<iframe src='x'></iframe>",
    );
    assert!(html.contains("<h1>Heading</h1>"));
    for fragment in ["<script", "<iframe", "<img", "<a "] {
        assert!(!html.contains(fragment), "{html}");
    }
}

fn run(root: &Path, args: &[&str]) {
    assert!(
        Command::new("git")
            .arg("-C")
            .arg(root)
            .args(args)
            .output()
            .unwrap()
            .status
            .success(),
        "{args:?}"
    );
}

#[test]
fn git_filenames_are_literal_when_loading_returned_paths() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    run(root, &["init", "-q"]);
    run(root, &["config", "user.name", "Local test"]);
    run(root, &["config", "user.email", "test@example.invalid"]);
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
    for staged in [false, true] {
        let s = git::open(root, "HEAD", None, staged, &[], root.join("feedback.json")).unwrap();
        assert_eq!(s.feedback.files.len(), names.len());
        for f in &s.feedback.files {
            assert_eq!(
                f.snapshots
                    .iter()
                    .find(|s| s.side == Side::Old)
                    .unwrap()
                    .text,
                format!("old {}\n", f.path)
            );
            assert_eq!(
                f.snapshots
                    .iter()
                    .find(|s| s.side == Side::New)
                    .unwrap()
                    .text,
                format!("new {}\n", f.path)
            );
        }
    }
}
#[test]
fn git_worktree_staged_commits_add_delete_and_multiple_hunks_have_reliable_sides() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    run(root, &["init", "-q"]);
    run(root, &["config", "user.name", "Local test"]);
    run(root, &["config", "user.email", "test@example.invalid"]);
    let original = (1..=30).map(|n| format!("line {n}\n")).collect::<String>();
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
    let mut s = git::open(root, "HEAD", None, false, &[], output.clone()).unwrap();
    assert_eq!(s.feedback.files.len(), 3);
    s.feedback.validate().unwrap();
    let f = s
        .feedback
        .files
        .iter()
        .find(|f| f.path.starts_with("a name"))
        .unwrap();
    assert_eq!(
        f.diff
            .as_ref()
            .unwrap()
            .iter()
            .filter(|r| r.kind == "hunk")
            .count(),
        2
    );
    let (file, old, new) = (
        f.id.clone(),
        f.snapshots
            .iter()
            .find(|s| s.side == Side::Old)
            .unwrap()
            .id
            .clone(),
        f.snapshots
            .iter()
            .find(|s| s.side == Side::New)
            .unwrap()
            .id
            .clone(),
    );
    let (a, b) = core::line_range(&original, 2, 2).unwrap();
    s.add(&file, &old, a, b, "Keep old context".into()).unwrap();
    let (a, b) = core::line_range(&changed, 2, 2).unwrap();
    s.add(&file, &new, a, b, "Fix new side".into()).unwrap();
    let saved = s.save().unwrap();
    let restored = Session::reopen(&saved, Some(root.into()), output.clone()).unwrap();
    assert_eq!(restored.feedback.comments[0].target.side, Side::Old);
    assert_eq!(restored.feedback.comments[1].target.quote, "new second\n");
    fs::write(root.join("added.txt"), "unstaged").unwrap();
    let staged = git::open(root, "HEAD", None, true, &[], output.clone()).unwrap();
    assert_eq!(
        staged
            .feedback
            .files
            .iter()
            .find(|f| f.path == "added.txt")
            .unwrap()
            .snapshots[0]
            .text,
        "added 🦀"
    );
    run(root, &["commit", "-qm", "revision"]);
    let commits = git::open(root, "HEAD~1", Some("HEAD"), false, &[], output).unwrap();
    commits.feedback.validate().unwrap();
    assert_eq!(commits.feedback.files.len(), 3);
    assert!(git::open(root, "--help", None, false, &[], root.join("x")).is_err());
}
