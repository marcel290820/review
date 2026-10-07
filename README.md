# Review

**Code review for everything your agent writes that isn't a pull request yet.**

Your agent wrote a plan, a spec, or a diff. Open it in the terminal or browser, pin comments to exact lines, and save them as one JSON file the agent can act on. No account, no server, no editor plugin.

![Reviewing an agent's plan in the terminal, saving feedback, and handing it back](docs/media/demo.gif)

- **Terminal or browser.** A keyboard-first TUI by default, `--browser` for pointer selection and a Markdown preview. Both save the same feedback.
- **Precise targets.** Each comment carries the file, line range, byte offsets, the exact quoted text, and surrounding context, so an agent can find the spot even after the file moves around.
- **Git-aware.** Review the working tree, the index, or any two commits, and comment on either side of the diff.
- **One local binary.** Rust, with the browser UI embedded. Nothing leaves your machine, and Review never edits your files.

## Install

Requires a recent stable Rust toolchain (verified with 1.99).

```sh
cargo install --locked --git https://github.com/marcel290820/review
```

Or build from a clone with `cargo build --locked --release`; the binary lands in `target/release/review`.

## Quick start

```sh
review plan.md                              # review a file in the terminal
review --browser plan.md notes.md           # several files, in the browser
review --diff --base main                   # review your branch against main
review --reopen review-feedback.json        # look at saved feedback again
```

In the TUI: `j`/`k` move, `v` selects lines, `c` comments, `Ctrl+S` records the comment, `s` saves, `q` quits, `?` shows every key. Feedback goes to `review-feedback.json`; a save never overwrites an existing file.

## Hand the feedback to your agent

Point any agent at the saved file:

```sh
claude "Address the review comments in review-feedback.json"
codex "Address the review comments in review-feedback.json"
```

To make agents handle it well every time, add this to your `AGENTS.md` or `CLAUDE.md`:

```markdown
## Review feedback

`review-feedback.json` files hold my review comments (format `review.feedback`, version 1).
For each entry in `comments`:
- `target.path` is the file, relative to the review's root. `target.side` is `source`,
  or `old`/`new` for a Git diff.
- `target.quote` is the exact text I commented on, with `target.before` and `target.after`
  as context. Locate the passage by the quote, not only by `start_line`, since the file may
  have changed since the review.
- `body` is what I want changed.
Address every comment, then list each one with what you did, or why you did not.
```

When the agent is done, run `review --reopen review-feedback.json --root .` to check its revisions against your comments, then open the revised files for the next round.

## Docs

| | |
| --- | --- |
| [Usage](docs/usage.md) | Saving, reopening, revisions, every TUI and browser key, Git diffs |
| [Feedback format](docs/feedback-format.md) | The JSON contract: snapshots, targets, offsets, validation |
| [Security and limits](docs/security.md) | The loopback browser boundary, size limits, and what is out of scope |
| [Development](docs/development.md) | Module layout, the check script, terminal and browser test suites |
| [Vision](docs/vision.md), [rationale](docs/rationale.md), [architecture](docs/architecture.md) | Why Review exists and how it is built |
