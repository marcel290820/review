# Local verification

Verified on 2026-10-06 on branch `rewrite/clean-room`, based on `ddc5a58`. The branch is a from-scratch rewrite of the Rust core, both interfaces, and the Rust tests. The feedback format is unchanged: `examples/feedback.json` and feedback saved by the previous implementation reopen without conversion.

The black-box acceptance suites, `tests/tui_smoke.py` and `frontend/tests/browser.mjs`, were kept from `ddc5a58` and pass against the rewrite. They drive the executable through a real PTY and through Chromium over loopback HTTP. The only change to them is one added browser scenario, described below.

An independent review with Codex (GPT 6.1 Sol, xhigh effort) compared the rewrite with `ddc5a58`. It reported four defects in the rewrite, all fixed with regression tests that fail before and pass after the fix: a revision root replaced by a symlink could expose outside files; a rejected mixed-side browser drag kept an earlier partial target; a failed save from the TUI quit prompt closed the prompt; and a failed save changed `saved_at`. Its fifth finding is the deliberate change that a newly opened review without comments no longer counts as unsaved.

## Results

| Gate | Result and evidence |
| --- | --- |
| Rust unit tests | **Passed:** 12 tests. Line ranges, exact UTF-8 targets and 80-character context, path rules, diff line numbering and hunks, inert Markdown, the comment editor (Unicode, vertical movement, pasted line endings), TUI single-side diff selection, and the quit prompt surviving a failed save. |
| Rust integration tests | **Passed:** 14 tests in `tests/review.rs`, `tests/git.rs`, and `tests/http.rs`. Covers the save/reopen/revise loop, CRLF and Unicode targets, corrupt or mismatched feedback, collision-safe and symlink-safe saves, failed-save retention, eight concurrent saves, missing and symlinked revisions, a revision root replaced by a symlink, binary/encoding/size/FIFO inputs, common-root paths, the documented example, literal Git paths, work tree/index/commit comparisons, pathspec filters, symlink rejection, HTTP CRUD and save, loopback/token/origin/cross-site guards, body limits, and security headers. |
| Frontend | **Passed:** `npm run check` reports 0 errors and 0 warnings with no suppressed diagnostics; `npm test` passes 3 byte/line tests; `npm run build` produces the bundle. |
| Actual terminal interaction | **Passed:** `tests/tui_smoke.py`, unchanged: line ranges, Unicode multiline paste, edit/delete/revisit, multiple files, versioned saves, reopening after revision, failed-save recovery, quit protection, terminal restoration, noninteractive CLI errors, old/new Git targets, and mixed-side rejection. |
| Actual browser interaction | **Passed:** `frontend/tests/browser.mjs`: mouse passage selection, Unicode byte offsets, Shift-click ranges, CRUD, multiple files, collision-safe saves, Markdown safety, edits from two tabs, browser → TUI → browser feedback, revision inspection, mobile layout, old/new Git targets, offline assets, save-failure recovery, and server quit protection. Added: a drag from the old into the new diff side is rejected and clears the earlier target. |
| Build and quality | **Passed:** `cargo fmt --all -- --check` and `cargo clippy --locked --all-targets -- -D warnings`. |

`.claude/check.sh` runs every gate above except the browser suite, which it adds with `REVIEW_BROWSER_TESTS=1`. CI runs the same script.

## Reproduce in this environment

Rust is installed with rustup under `~/.cargo`. Chromium and its libraries live under `/tmp`:

```sh
(cd frontend && npm ci)
LD_LIBRARY_PATH=/tmp/review-browser-deps-repro/lib/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/review-browsers \
REVIEW_BROWSER_TESTS=1 .claude/check.sh
```

Tool versions: Rust 1.99.0, Node 24.21.0, npm 11.19.0, Git 2.43.0, Python 3.12.3, Svelte 5.57.1, Vite 8.3.2, TypeScript 6.0.3, Playwright 1.63.0, and Chromium Headless Shell 153.

## Limits and unverified areas

- Runtime and interaction checks ran on Linux with Chromium. macOS, Windows, other browsers, other terminal emulators, and manual screen-reader use remain unverified.
- Markdown preview stays read-only; comments target source. Revision views are read-only, and no comment is relocated or resolved automatically.
- Feedback and drafts live in memory until an explicit save. Abrupt process termination and unrecorded browser drafts have no recovery.
