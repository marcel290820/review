# Development

The code is organized as one library with two interfaces:

| Module | Responsibility |
| --- | --- |
| `src/feedback.rs` | The saved format, coordinate convention, target construction, and validation |
| `src/session.rs` | One review in memory: comment changes, unsaved state, saving, disk revisions |
| `src/files.rs` | Bounded text reads, symlink-free reads below a root, saves that never replace files |
| `src/diff.rs` | Unified diff rows numbered like comment targets, with changed words and hunk labels |
| `src/markdown.rs` | Markdown styling marks for source lines and inert preview HTML, for both interfaces |
| `src/git.rs` | Review content from read-only Git commands |
| `src/tui/` | Terminal interface: state and keys (`app.rs`), drawing (`view.rs`), colors (`theme.rs`), text measuring (`text.rs`), comment editor |
| `src/http.rs` | Loopback HTTP adapter and embedded assets |
| `frontend/src/` | Svelte browser interface: state and actions (`review.svelte.ts`), view rows (`rows.ts`), byte and line math mirroring the core (`lines.ts`), and components |
| `frontend/public/fonts/` | The embedded fonts and their licenses |

The checked-in `frontend/dist` bundle lets a Rust-only build work. When changing the frontend, use Node (verified with 24.21.0) and regenerate it before building Rust; CI fails when the committed bundle differs from a fresh build.

One script runs every check: the frontend typecheck, unit tests, and build; `cargo fmt`, Clippy, and Rust tests; and the real-terminal PTY suite. CI runs the same script.

```sh
(cd frontend && npm ci)
.claude/check.sh
```

The PTY checks require Unix, Python 3, and Git; fixtures and repositories are created automatically under a temporary directory. They drive actual terminal keys and inspect saved feedback and restored terminal settings.

Actual browser checks use Playwright and a copied executable running outside the repository. Install Chromium once, then include them in the check:

```sh
(cd frontend && npx playwright install chromium --only-shell)
REVIEW_BROWSER_TESTS=1 .claude/check.sh
```

Chromium needs its platform libraries. On a minimal Ubuntu 24.04 environment, [tests/browser-deps.sh](../tests/browser-deps.sh) downloads and extracts them into a temporary directory without root or system installation:

```sh
sh tests/browser-deps.sh /tmp/review-browser-deps-local
LD_LIBRARY_PATH=/tmp/review-browser-deps-local/lib/usr/lib/x86_64-linux-gnu REVIEW_BROWSER_TESTS=1 .claude/check.sh
```

Set `REVIEW_BIN=/absolute/path/to/review` to run `npm run test:browser` or `python3 tests/tui_smoke.py` against a different build. `PLAYWRIGHT_BROWSERS_PATH` can place test browser downloads under `/tmp`. The browser suite drives real pointer and keyboard interactions, follows browser → TUI → browser feedback, verifies revision inspection, old/new targets, offline assets, safe Markdown, edits from several tabs, and save failures. It writes a screenshot to `/tmp/review-artifacts/browser.png`.

See [verification.md](verification.md) for the completed local checks and their limits.

The design docs record why Review looks the way it does: [vision](vision.md), [rationale](rationale.md), and [architecture](architecture.md).
