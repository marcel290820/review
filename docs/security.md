# Security and limits

## Local browser boundary

The server binds to `127.0.0.1` only. A random session token is carried in the URL fragment and kept in that tab's session storage. APIs require that token, the expected Host, and an allowed Origin. Cross-site requests are rejected. Responses disable caching and carry a restrictive content security policy. Keep the printed session URL private to your review.

The API exposes selected snapshots, comments, revision inspection, and the CLI-configured save destination. It has no arbitrary path-reading or path-writing endpoint. Imported feedback cannot authorize disk access. Revision reads reject traversal and symlinks below the explicitly selected root. Markdown HTML is escaped; link and image markup becomes text, so documents cannot execute scripts or request external resources. Browser assets, including fonts, are embedded in the executable and need no runtime downloads.

## Scope and limits

This version implements the initial text, multiple-file, and unified-diff workflow in both interfaces. It uses the proposed Rust/Clap/Ratatui/Crossterm/Axum core and a TypeScript/Svelte/Vite frontend. Source selection provides reliable targets; rendered Markdown selection is deferred. Explicit saves and immutable snapshots keep the feedback workflow independent of any agent.

Limits are 2 MiB per text snapshot, 16 MiB of selected snapshots, 256 files, 10,000 comments, 32 KiB per comment, and 64 MiB per feedback file. Files must be regular UTF-8 text without NUL bytes. Revisions are inspected rather than merged into saved snapshots. There is no automatic draft recovery, editing, agent execution, accounts, image/PDF review, or cloud service. Linux was verified; other platforms and manual assistive-technology checks remain unverified.
