# Review

Review opens local UTF-8 text and Markdown files, collects precise comments in a terminal or browser, and saves portable JSON feedback. One Rust executable contains both interfaces and the browser assets. It runs locally without accounts, Node, or a separate backend installation.

## Build and run

The build was verified on Linux with Rust 1.99.0. Install a Rust toolchain, then build from this directory:

```sh
cargo build --locked --release
./target/release/review examples/example.md
```

The default interface is the TUI in an interactive terminal. Browser mode prints a clickable loopback URL; open it in your browser and keep the process running while reviewing:

```sh
./target/release/review --browser examples/example.md
./target/release/review first.md second.txt --output ./feedback.json
./target/release/review --browser first.md second.txt --output ./feedback.json
```

In later examples, `review` means `./target/release/review` or a copy you put on your PATH.

Without an interactive terminal, use `--browser` explicitly. `--tui` explicitly selects the terminal interface and still requires a terminal. `--help` lists all options. `--port 0` selects an available browser port and is the default.

The save destination defaults to `review-feedback.json` in the invocation directory. The interfaces show its absolute path. Each save creates a new file: `feedback.json`, `feedback.json.1.json`, `feedback.json.2.json`, and so on. Existing files, including unrelated files and symlinks, remain untouched. The saved filename is reported after saving. The destination directory must exist. A failed save retains the session and its unsaved state.

## Complete a review

1. Open one or more files. Review reads immutable snapshots.
2. Navigate and select a source passage or line range. Write a comment.
3. Record the comment, then save feedback to disk. Give the saved JSON file to your existing agent or editor workflow.
4. Reopen the feedback in either interface. Comments retain the same targets, quotes, and surrounding context.
5. To inspect revised files, authorize their source root explicitly:

```sh
./target/release/review --reopen feedback.json
./target/release/review --browser --reopen feedback.json --root /path/to/source
./target/release/review --reopen examples/feedback.json --root examples
```

Reopening without `--root` reads only the saved snapshots. Review never follows the `source_root_hint` in imported JSON. Paths in feedback are relative to the original invocation directory when it contains all selected files, otherwise to their common parent. Use that directory as `--root` after revision; the hint helps identify it. Moving feedback does not change its meaning.

Both interfaces check disk revisions periodically. Inspect revisions shows additions and deletions against the reviewed source or new diff side, with a text fallback if Git is unavailable. Missing, inaccessible, and changed files are explicit states. Revision views are read-only: comments stay attached to their original snapshots, and content changes never resolve a concern. Open the revised files as a new review to comment on them.

### Terminal controls

| Key | Action |
| --- | --- |
| `j`/`k`, arrows, Page Up/Down, Home/End | Navigate content or comments |
| `h`/`l`, left/right arrows | Scroll long source lines horizontally |
| `v`, move, `c` | Select a line range and write a comment |
| `c` | Comment on the current line |
| `Tab` | Switch focus between content and comments |
| `Enter` on a comment | Revisit its original target |
| `e` / `d` on a comment | Edit / confirm deletion |
| `[` / `]` | Previous / next file |
| `b` | Cycle unified diff, full old source, and full new source |
| `o` / `n` | Choose old / new targets for diff context lines |
| `r` | Refresh and toggle the disk revision view |
| `s` | Save feedback |
| `q` / Ctrl+C | Quit; unsaved feedback prompts for save, discard, or cancel |

Comment input supports multiline text, Unicode, arrows, Home/End, Backspace/Delete, and bracketed paste. Enter inserts a newline; Ctrl+S records the comment in memory; Esc cancels the draft. Press `s` afterward to save JSON. The TUI displays source text with line numbers, including Markdown syntax. It replaces terminal control characters for display while preserving the original bytes in feedback.

### Browser controls

Select source text with the pointer, click a line number, Shift-click another line to extend a range, or enter a start and end line. Write a comment and choose **Add comment**, then **Save feedback**. Click a comment's target to revisit it; Edit and Delete manage comments. `[`/`]` switch files, and Ctrl+S records a focused comment or saves feedback outside the editor.

Markdown preview is read-only. Use Source for precise targeting. In a unified diff, old and new line-number buttons choose their respective snapshots; a selector chooses the target side of context text. Selections spanning both sides are rejected. Full source views support ranges that cross separate hunks.

The browser warns before leaving with unsaved feedback or a draft. The first Ctrl+C in the server also preserves recorded unsaved feedback; save in the browser and stop again. A second Ctrl+C within three seconds explicitly discards it. Abrupt termination cannot preserve in-memory feedback or unrecorded drafts.

## Git diffs

Git is optional for ordinary file review and required for Git comparisons. Review invokes the installed Git executable with external diff and text conversion disabled. It does not modify the repository.

```sh
review --diff
review --browser --diff --staged
review --diff --base main
review --diff --base HEAD~1 --head HEAD
review --diff --repo /path/to/repo -- docs/plan.md src/main.rs
```

`--diff` compares HEAD with the working tree, including staged content. `--staged` compares the base with the index. `--head` compares two commits. File filters are Git pathspecs relative to the repository root. Added and deleted files and multiple hunks have separate old/new snapshot targets. Renames appear as deletion plus addition. Empty and mode-only changes use full source views. Open untracked files directly. Merge conflicts, binary files, submodules, and symlink entries produce errors instead of guessed targets.

## Feedback contract

See [examples/feedback.json](examples/feedback.json) for a complete readable example. The format is `review.feedback`, version `1`:

- `files` contain relative paths, stable IDs, complete reviewed snapshots, SHA-256 hashes, and optional unified diff rows.
- Each comment identifies its file, snapshot, side (`source`, `old`, or `new`), selected quote, surrounding context, and requested change.
- `start_byte` and `end_byte` are zero-based UTF-8 byte offsets forming a half-open range `[start_byte, end_byte)`. They refer to that snapshot's exact bytes, including CRLF. Line numbers are one-based and inclusive. Empty-file targets use `[0, 0)`.
- Comment editing changes the body while preserving the target. Deletion is explicit. There is no inferred resolution or automatic relocation.
- Reopening rejects unsupported versions, unknown fields, duplicate identifiers, invalid checksums, invalid UTF-8 boundaries, mismatched quotes/context, and invalid diff-side mappings.
- Saves use a temporary file, sync it, and publish it without replacing an existing filename. Concurrent saves receive distinct names.

## Local browser boundary

The server binds to `127.0.0.1` only. A random session token is carried in the URL fragment and kept in that tab's session storage. APIs require that token, the expected Host, and an allowed Origin. Cross-site requests are rejected. Responses disable caching and carry a restrictive content security policy. Keep the printed session URL private to your review.

The API exposes selected snapshots, comments, revision inspection, and the CLI-configured save destination. It has no arbitrary path-reading or path-writing endpoint. Imported feedback cannot authorize disk access. Revision reads reject traversal and symlinks below the explicitly selected root. Markdown HTML is escaped; link and image markup becomes text, so documents cannot execute scripts or request external resources. Browser assets are embedded with `include_str!` and need no runtime downloads.

## Development and verification

The checked-in `frontend/dist` bundle lets a Rust-only build work. When changing the frontend, use Node (verified with 24.21.0) and regenerate it before building Rust:

```sh
cd frontend
npm ci
npm run check
npm test
npm run build
cd ..
cargo build --locked
cargo test --locked
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings
python3 tests/tui_smoke.py
```

The PTY checks require Unix, Python 3, and Git; fixtures and repositories are created automatically under a temporary directory. They drive actual terminal keys and inspect saved feedback and restored terminal settings.

Actual browser checks use Playwright and a copied executable running outside the repository:

```sh
cd frontend
npx playwright install chromium --only-shell
npm run test:browser
```

Chromium needs its platform libraries. On a minimal Ubuntu 24.04 environment, [tests/browser-deps.sh](tests/browser-deps.sh) downloads and extracts them into a temporary directory without root or system installation:

```sh
# From the repository root:
sh tests/browser-deps.sh /tmp/review-browser-deps-local
cd frontend
LD_LIBRARY_PATH=/tmp/review-browser-deps-local/lib/usr/lib/x86_64-linux-gnu npm run test:browser
```

Set `REVIEW_BIN=/absolute/path/to/review` to test a different build. `PLAYWRIGHT_BROWSERS_PATH` can place test browser downloads under `/tmp`. The browser suite drives real pointer and keyboard interactions, follows browser → TUI → browser feedback, verifies revision inspection, old/new targets, offline assets, safe Markdown, stale edit conflicts, and save failures. It writes a screenshot to `/tmp/review-artifacts/browser.png`.

See [VERIFICATION.md](VERIFICATION.md) for the completed local checks and their limits.

## Scope and assumptions

This version implements the initial text, multiple-file, and unified-diff workflow in both interfaces. It uses the proposed Rust/Clap/Ratatui/Crossterm/Axum core and a TypeScript/Svelte/Vite frontend. Source selection provides reliable targets; rendered Markdown selection is deferred. Explicit saves and immutable snapshots keep the feedback workflow independent of any agent.

Limits are 2 MiB per text snapshot, 16 MiB of selected snapshots, 256 files, 10,000 comments, 32 KiB per comment, and 64 MiB per feedback file. Files must be regular UTF-8 text without NUL bytes. Revisions are inspected rather than merged into saved snapshots. There is no automatic draft recovery, editing, agent execution, accounts, image/PDF review, or cloud service. Linux was verified; other platforms and manual assistive-technology checks remain unverified.
