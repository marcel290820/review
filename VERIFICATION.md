# Local verification

Verified on 2026-10-04 in `/home/dev/worktrees/review-mvp`, branch `review/mvp`, based on `ca07773`. The original worktree remains clean on `main`; VISION.md, RATIONALE.md, and ARCHITECTURE.md are unchanged. No project commit, push, deployment, Docker access, or retained service credentials were needed.

The initial text and Git review scope is implemented and locally verified in both interfaces. This is evidence from running the application, including real terminal and browser input, rather than a compilation-only readiness claim.

## Results

| Gate | Result and evidence |
| --- | --- |
| Rust core and persistence | **Passed:** 11 integration tests in `tests/core.rs`. Covers immutable snapshots, exact Unicode/CRLF byte ranges, empty files, comment CRUD, save/reopen/revise/inspect, example feedback, invalid/corrupt imports, binary/encoding/size limits, missing/symlinked revisions, unrelated-file preservation, failed-save retention, and eight concurrent saves. |
| Git comparisons | **Passed:** core tests cover working tree, staged index, and two commits; additions, deletions, separate hunks, final lines without newlines, old/new comments, and filenames with spaces, tabs, Unicode, wildcards, brackets, leading colon, and embedded newline. Returned paths are loaded literally. |
| HTTP adapter | **Passed:** 2 integration tests in `tests/http.rs`. Exercises CRUD and save through actual handlers, stale revisions, invalid targets, unauthorized access, foreign Host/Origin, body limits, unknown paths, browser path injection, and response security headers. |
| Frontend | **Passed:** `npm run check` reports zero errors and warnings; `npm test` passes the UTF-8/CRLF/empty-file range test; `npm run build` produces the bundled JavaScript and CSS. |
| Actual terminal interaction | **Passed:** `tests/tui_smoke.py` drives the release executable through a real PTY. Checks line-range selection, Unicode multiline paste, edit/delete/revisit, multiple files, versioned saves, reopening after revision, failed-save recovery, quit protection, terminal restoration, noninteractive CLI errors, old/new Git targets, and mixed-side rejection. |
| Actual browser interaction | **Passed:** `frontend/tests/browser.mjs` drives Chromium against the release executable and real loopback HTTP. Checks mouse passage selection, Unicode byte offsets, Shift-click ranges, CRUD, multiple files, collision-safe saves, Markdown safety, stale-edit draft preservation, revision inspection, original target revisiting, mobile layout, old/new Git targets, save-failure recovery, and server quit protection. |
| Feedback between interfaces | **Passed:** the browser creates and saves comments; actual PTY keys edit that JSON in the TUI and add a multiline comment; a browser reopens it after source revision. The original target is compared in full and remains identical. |
| Offline executable packaging | **Passed:** the browser suite copies the executable outside the repository, gives the server a PATH containing only Git, and allows only requests to its loopback origin. Assets load, Markdown initiates no external resource requests, and all workflows complete without Node or frontend files available to the server. |
| Build and quality | **Passed:** `cargo build --locked --offline --release`, `cargo fmt --all -- --check`, and `cargo clippy --locked --all-targets -- -D warnings`. |
| Local test setup | **Passed:** the project supplies temporary fixtures, Git repositories, a Python standard-library PTY driver, and Playwright browser tests. `tests/browser-deps.sh` was run successfully to extract Ubuntu browser libraries locally without root or system installation. |

The optimized executable is available at `target/release/review` (3,377,152 bytes). SHA-256:

```text
a636417e492644800c7006b14f4451d8bdd09cc2b0e03379a5668ee468182285
```

`examples/feedback.json` is validated by a core test and matches `examples/example.md`. The browser screenshot at `/tmp/review-artifacts/browser.png` was visually inspected for content, comments, selection, save destination, and revision status. The automated suite also checks a 480-pixel viewport for page overflow.

## Reproduce in this environment

Rust was initially absent. The temporary toolchain and Cargo cache are under `/tmp/review-toolchain`; build output is under `/tmp/review-target`. These environment variables reproduce the completed Rust checks without modifying system directories:

```sh
cd /home/dev/worktrees/review-mvp
export CARGO_HOME=/tmp/review-toolchain/cargo
export RUSTUP_HOME=/tmp/review-toolchain/rustup
export CARGO_TARGET_DIR=/tmp/review-target
export PATH=/tmp/review-toolchain/cargo/bin:$PATH
cargo test --locked
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings
cargo build --locked --offline --release
REVIEW_BIN=/tmp/review-target/release/review python3 tests/tui_smoke.py
```

Frontend and browser checks used the locked packages in `frontend/node_modules`. Chromium's libraries were downloaded and extracted under `/tmp`, without a system package installation:

```sh
cd /home/dev/worktrees/review-mvp/frontend
npm run check
npm test
npm run build
LD_LIBRARY_PATH=/tmp/review-browser-deps-repro/lib/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/review-browsers \
REVIEW_BIN=/tmp/review-target/release/review npm run test:browser
```

When rebuilding frontend assets, rebuild Rust afterward to embed the new bundle. In this managed environment, commands that write to the worktree need its approved filesystem permission, including the frontend checker's temporary Vite config. Ordinary usage of the copied release executable needs no build tools.

Tool versions: Rust 1.99.0, Node 24.21.0, npm 11.19.0, Git 2.43.0, Python 3.12.3, Svelte 5.57.1, Vite 8.3.2, TypeScript 6.0.3, Playwright 1.63.0, and Chromium Headless Shell 153.0.8010.12. Current framework and Git documentation was checked through Context7 during implementation. Dependency lockfiles are included.

## Limits and unverified areas

- Runtime and actual interaction checks were performed on Linux with Chromium. macOS, Windows, other browsers, terminal emulators, and manual screen-reader interaction remain unverified.
- Markdown preview uses source selection for comments. Revision views are read-only; review revised content in a new session to comment on it. No comment is relocated or resolved automatically.
- Feedback and drafts live in memory until an explicit save. Save failures and ordinary quit attempts preserve recorded feedback; abrupt process termination and unrecorded browser drafts have no automatic recovery.
- The documented file, session, comment, and feedback size limits bound this version. No image/PDF review, editing, agent execution, accounts, or cloud integration is implemented.

No genuine blocker remains for the requested initial local scope. No user-provided infrastructure, credentials, external service, or further approval is required to run the delivered executable.
