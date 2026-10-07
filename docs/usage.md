# Using Review

Review opens local UTF-8 text and Markdown files, collects precise comments in a terminal or browser, and saves portable JSON feedback.

- [Open files](#open-files)
- [The review loop](#the-review-loop)
- [Terminal controls](#terminal-controls)
- [Browser controls](#browser-controls)
- [Git diffs](#git-diffs)

## Open files

```sh
review examples/example.md
review --browser examples/example.md
review first.md second.txt --output ./feedback.json
review --browser first.md second.txt --output ./feedback.json
```

The TUI is the default in an interactive terminal. Browser mode prints a clickable loopback URL; open it and keep the process running while you review. Without an interactive terminal, use `--browser` explicitly. `--tui` explicitly selects the terminal interface and still requires a terminal. `--help` lists all options. `--port 0` selects an available browser port and is the default.

The save destination defaults to `review-feedback.json` in the invocation directory. The browser shows its absolute path; in the TUI, `?` shows it. Each save creates a new file: `feedback.json`, `feedback.json.1.json`, `feedback.json.2.json`, and so on. Existing files, including unrelated files and symlinks, remain untouched. The saved filename is reported after saving. The destination directory must exist. A failed save retains the session and its unsaved state. Feedback counts as unsaved when comments changed since the review was opened or last saved.

## The review loop

1. Open one or more files. Review reads immutable snapshots.
2. Navigate and select a source passage or line range. Write a comment.
3. Record the comment, then save feedback to disk. Give the saved JSON file to your existing agent or editor workflow.
4. Reopen the feedback in either interface. Comments retain the same targets, quotes, and surrounding context.
5. To inspect revised files, authorize their source root explicitly:

```sh
review --reopen feedback.json
review --browser --reopen feedback.json --root /path/to/source
review --reopen examples/feedback.json --root examples
```

Reopening without `--root` reads only the saved snapshots. Review never follows the `source_root_hint` in imported JSON. Paths in feedback are relative to the original invocation directory when it contains all selected files, otherwise to their common parent. Use that directory as `--root` after revision; the hint helps identify it. Moving feedback does not change its meaning.

Both interfaces check disk revisions periodically. Inspect revisions shows additions and deletions against the reviewed source or new diff side. Missing, inaccessible, and changed files are explicit states. Revision views are read-only: comments stay attached to their original snapshots, and content changes never resolve a concern. Open the revised files as a new review to comment on them.

## Terminal controls

| Key | Action |
| --- | --- |
| `j`/`k`, arrows, Page Up/Down, Home/End | Navigate content or comments |
| `h`/`l`, left/right arrows | Scroll long source lines horizontally |
| `v`, move, `c` | Select a line range and write a comment |
| `c` | Comment on the current line |
| `Tab` | Open or close the list of all comments, grouped by file |
| `Enter` on a comment | Revisit its original target |
| `e` / `d` on a comment | Edit / confirm deletion |
| `[` / `]` | Previous / next file |
| `b` | Cycle unified diff, full old source, and full new source |
| `o` / `n` | Choose old / new targets for diff context lines |
| `r` | Refresh and toggle the disk revision view |
| `s` | Save feedback |
| `?` | Show all keys and the save destination |
| `q` / Ctrl+C | Quit; unsaved feedback prompts for save, discard, or cancel |

Comment input supports multiline text, Unicode, arrows, Home/End, Backspace/Delete, and bracketed paste. Enter inserts a newline; Ctrl+S records the comment in memory; Esc cancels the draft. Press `s` afterward to save JSON. The TUI displays source text with line numbers, including Markdown syntax, which it styles lightly. Comments appear beneath the lines they target, and a draft shows where it will land while you write. In long files, a rail on the right edge marks the visible part and each comment. Diffs label each hunk with its lines and highlight changed words. The TUI replaces terminal control characters for display while preserving the original bytes in feedback.

The TUI keeps your terminal's font and background. At startup it asks the terminal for its colors and derives a matching light or dark palette; terminals that do not answer get the dark palette. Colors use 24-bit values when `COLORTERM` is `truecolor` or `24bit`, otherwise the 256-color palette. `NO_COLOR` turns colors off.

## Browser controls

Click a line number, Shift-click another to extend the range, or drag across text for an exact passage, then press `c` or the **Comment** button. The composer opens where the comment will land; Ctrl+Enter or Ctrl+S records it and Esc cancels. Comments hang beneath their lines, with Edit and Delete beside them. **Save feedback**, `s`, or Ctrl+S outside the composer saves.

The keys follow the TUI: `j`/`k` move, `v` selects lines, `c` comments, `a` lists all comments (`j`/`k`, Enter, `e`, and `d` act on the list), `[`/`]` switch files, `b` cycles views, `o`/`n` choose the side for diff context lines, `r` shows changes on disk, and `?` shows every key and the save destination. Tab keeps moving focus, so the list uses `a`.

The Markdown preview is read-only; comments target the source, which styles Markdown lightly. In a unified diff, old and new line numbers choose their snapshots, and dragged context text targets the side `o`/`n` chose, new by default. Selections spanning both sides are rejected. The old and new source views support ranges that cross separate hunks.

The interface follows the system's light or dark setting and embeds its fonts, JetBrains Mono and IBM Plex Sans (SIL Open Font License). Large files stay responsive: rows render in chunks that the browser skips while they are off screen, and files over 4,000 lines render each chunk as it nears the view, so the browser's find covers only what has rendered.

Several tabs share one review session; when two tabs edit the same comment, the last recorded edit wins. The browser warns before leaving with unsaved feedback or a draft. The first Ctrl+C in the server also preserves recorded unsaved feedback; save in the browser and stop again. A second Ctrl+C within three seconds explicitly discards it. Abrupt termination cannot preserve in-memory feedback or unrecorded drafts.

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
