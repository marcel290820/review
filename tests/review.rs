use review::{
    diff::DiffKind,
    feedback::{Feedback, MAX_TEXT, line_range},
    files,
    session::{DiskStatus, Session},
};
use serde_json::{Value, json};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};
use tempfile::TempDir;

fn open(text: &str) -> (TempDir, Session) {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("note.md"), text).unwrap();
    let session = open_note(&dir, dir.path().join("feedback.json"));
    (dir, session)
}

fn open_note(dir: &TempDir, output: PathBuf) -> Session {
    Session::open(&[dir.path().join("note.md")], output).unwrap()
}

fn comment_line(session: &mut Session, line: usize, body: &str) -> String {
    let file = &session.files()[0];
    let snapshot = &file.snapshots[0];
    let bytes = line_range(&snapshot.text, line, line).unwrap();
    let (file_id, snapshot_id) = (file.id.clone(), snapshot.id.clone());
    session
        .add_comment(&file_id, &snapshot_id, bytes, body.into())
        .unwrap()
}

#[test]
fn complete_loop_preserves_snapshot_context_and_saves_versions() {
    let (dir, mut session) = open("# Plan\r\n\r\nKeep café 🦀 unchanged.\r\nLast line");
    assert!(!session.is_dirty(), "a new review has nothing to lose");
    let id = comment_line(&mut session, 3, "Explain this\nAnd this");
    assert!(session.is_dirty());
    let original = session.comments()[0].target.clone();
    assert_eq!(original.quote, "Keep café 🦀 unchanged.\r\n");
    session
        .edit_comment(&id, "A revised request".into())
        .unwrap();
    assert_eq!(session.comments()[0].target, original);

    let saved = session.save().unwrap();
    assert!(!session.is_dirty());
    assert_eq!(session.last_saved(), Some(saved.as_path()));
    let saved_bytes = fs::read(&saved).unwrap();

    fs::write(
        dir.path().join("note.md"),
        "Inserted line\n# Plan\nChanged passage\n",
    )
    .unwrap();
    let mut reopened = Session::reopen(
        &saved,
        Some(dir.path().into()),
        dir.path().join("feedback.json"),
    )
    .unwrap();
    assert!(!reopened.is_dirty());
    assert_eq!(reopened.comments()[0].target, original);
    assert_eq!(reopened.comments()[0].body, "A revised request");
    assert_eq!(reopened.disk(0).status, DiskStatus::Changed);
    assert!(
        reopened
            .disk(0)
            .diff
            .iter()
            .any(|row| row.kind == DiffKind::Add && row.text == "Inserted line")
    );

    let second = reopened.save().unwrap();
    assert_ne!(second, saved);
    assert_eq!(fs::read(&saved).unwrap(), saved_bytes);
    reopened.delete_comment(&id).unwrap();
    assert!(reopened.comments().is_empty());

    let detached = Session::reopen(&second, None, dir.path().join("elsewhere.json")).unwrap();
    assert_eq!(detached.disk(0).status, DiskStatus::Detached);
}

#[test]
fn rejects_corrupt_unknown_or_misidentified_feedback() {
    let (_dir, mut session) = open("alpha\nbeta\n");
    let id = comment_line(&mut session, 2, "Fix it");
    let valid = serde_json::to_value(session.feedback()).unwrap();
    let mutations: [fn(&mut Value); 11] = [
        |v| v["version"] = 2.into(),
        |v| v["format"] = "other".into(),
        |v| v["files"] = json!([]),
        |v| v["files"][0]["snapshots"][0]["text"] = "changed".into(),
        |v| v["files"][0]["path"] = "../escape".into(),
        |v| v["files"][0]["path"] = "/absolute".into(),
        |v| v["comments"][0]["target"]["quote"] = "wrong".into(),
        |v| v["comments"][0]["target"]["side"] = "new".into(),
        |v| v["comments"][0]["target"]["end_byte"] = 999.into(),
        |v| v["comments"][0]["id"] = v["files"][0]["id"].clone(),
        |v| {
            // An opened file cannot also have a Git side.
            let mut old = v["files"][0]["snapshots"][0].clone();
            old["id"] = "old".into();
            old["side"] = "old".into();
            v["files"][0]["snapshots"].as_array_mut().unwrap().push(old);
        },
    ];
    for (i, mutate) in mutations.into_iter().enumerate() {
        let mut value = valid.clone();
        mutate(&mut value);
        let feedback: Feedback = serde_json::from_value(value).unwrap();
        assert!(feedback.validate().is_err(), "mutation {i} was accepted");
    }
    let mut unknown = valid;
    unknown["unexpected"] = true.into();
    assert!(serde_json::from_value::<Feedback>(unknown).is_err());

    assert!(session.edit_comment("nonexistent", "x".into()).is_err());
    assert!(session.edit_comment(&id, "  ".into()).is_err());
    assert!(session.delete_comment("nonexistent").is_err());
}

#[test]
fn saves_never_replace_files_or_symlinks_and_failures_keep_state() {
    let (dir, mut session) = open("text\n");
    comment_line(&mut session, 1, "request");
    let output = dir.path().join("feedback.json");
    fs::write(&output, "unrelated").unwrap();
    assert_eq!(
        session.save().unwrap(),
        dir.path().join("feedback.json.1.json")
    );
    assert_eq!(fs::read_to_string(&output).unwrap(), "unrelated");

    let mut failing = open_note(&dir, dir.path().join("absent/feedback.json"));
    comment_line(&mut failing, 1, "kept");
    let error = failing.save().unwrap_err().to_string();
    assert!(error.contains("Save directory does not exist"), "{error}");
    assert!(failing.is_dirty());
    assert_eq!(failing.comments().len(), 1);
    assert_eq!(failing.last_saved(), None);
    assert_eq!(
        failing.feedback().saved_at,
        0,
        "a failed save is not a save"
    );

    #[cfg(unix)]
    {
        let link = dir.path().join("link.json");
        std::os::unix::fs::symlink(dir.path().join("note.md"), &link).unwrap();
        let mut session = open_note(&dir, link);
        comment_line(&mut session, 1, "request");
        assert_eq!(session.save().unwrap(), dir.path().join("link.json.1.json"));
        assert_eq!(
            fs::read_to_string(dir.path().join("note.md")).unwrap(),
            "text\n"
        );
    }
}

#[test]
fn concurrent_saves_get_distinct_files() {
    let (dir, session) = open("text");
    let threads: Vec<_> = (0..8)
        .map(|_| {
            let feedback = session.feedback().clone();
            let output = dir.path().join("shared.json");
            std::thread::spawn(move || {
                Session::new(feedback, None, output)
                    .unwrap()
                    .save()
                    .unwrap()
            })
        })
        .collect();
    let saved: HashSet<_> = threads.into_iter().map(|t| t.join().unwrap()).collect();
    assert_eq!(saved.len(), 8);
    for path in saved {
        Session::reopen(&path, None, dir.path().join("unused.json")).unwrap();
    }
}

#[test]
fn missing_and_symlinked_revisions_stay_explicit() {
    let (dir, mut session) = open("reviewed");
    comment_line(&mut session, 1, "Keep context");
    assert_eq!(session.disk(0).status, DiskStatus::Unchanged);
    fs::remove_file(dir.path().join("note.md")).unwrap();
    session.refresh();
    assert_eq!(session.disk(0).status, DiskStatus::Missing);
    #[cfg(unix)]
    {
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("private"), "unselected").unwrap();
        std::os::unix::fs::symlink(outside.path().join("private"), dir.path().join("note.md"))
            .unwrap();
        session.refresh();
        assert_eq!(session.disk(0).status, DiskStatus::Unavailable);
        assert!(session.disk(0).diff.is_empty());
    }
    assert_eq!(session.comments()[0].target.quote, "reviewed");
}

#[cfg(unix)]
#[test]
fn a_replaced_root_cannot_expose_files_outside_it() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("source");
    fs::create_dir(&root).unwrap();
    fs::write(root.join("note.md"), "reviewed").unwrap();
    let mut session =
        Session::open(&[root.join("note.md")], parent.path().join("out.json")).unwrap();
    assert_eq!(session.disk(0).status, DiskStatus::Unchanged);

    let outside = parent.path().join("outside");
    fs::create_dir(&outside).unwrap();
    fs::write(outside.join("note.md"), "private").unwrap();
    fs::rename(&root, parent.path().join("moved")).unwrap();
    std::os::unix::fs::symlink(&outside, &root).unwrap();
    session.refresh();
    assert_eq!(session.disk(0).status, DiskStatus::Unavailable);
    assert!(session.disk(0).diff.is_empty());
}

#[test]
fn rejects_binary_non_utf8_oversized_and_irregular_files() {
    let dir = tempfile::tempdir().unwrap();
    for (name, bytes) in [
        ("binary", vec![0, 1]),
        ("encoding", vec![255]),
        ("large", vec![b'a'; MAX_TEXT + 1]),
    ] {
        let path = dir.path().join(name);
        fs::write(&path, bytes).unwrap();
        assert!(files::read_text(&path).is_err(), "{name}");
    }
    assert!(files::read_text(dir.path()).is_err());
    #[cfg(unix)]
    {
        // Reading must fail at once rather than wait for a FIFO writer.
        let fifo = dir.path().join("fifo");
        let made = std::process::Command::new("mkfifo")
            .arg(&fifo)
            .status()
            .unwrap();
        assert!(made.success());
        assert!(files::read_text(&fifo).is_err());
    }
}

#[test]
fn paths_are_relative_to_the_files_common_directory() {
    let dir = tempfile::tempdir().unwrap();
    for name in ["a", "b"] {
        fs::create_dir(dir.path().join(name)).unwrap();
        fs::write(dir.path().join(name).join("file.md"), name).unwrap();
    }
    let session = Session::open(
        &[dir.path().join("a/file.md"), dir.path().join("b/file.md")],
        dir.path().join("feedback.json"),
    )
    .unwrap();
    let paths: Vec<_> = session.files().iter().map(|f| f.path.as_str()).collect();
    assert_eq!(paths, ["a/file.md", "b/file.md"]);
    assert_eq!(
        session.feedback().source_root_hint,
        dir.path().canonicalize().unwrap().display().to_string()
    );
}

#[test]
fn documented_example_reopens_and_matches_its_source() {
    let examples = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples");
    let output = tempfile::tempdir().unwrap();
    let session = Session::reopen(
        &examples.join("feedback.json"),
        Some(examples),
        output.path().join("feedback.json"),
    )
    .unwrap();
    assert_eq!(session.disk(0).status, DiskStatus::Unchanged);
    assert_eq!(
        session.comments()[0].target.quote,
        "Ship the local review loop.\n"
    );
}
