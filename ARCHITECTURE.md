# Architecture and technology proposal

This draft proposes the foundations to agree on before implementation. It follows [the vision](VISION.md) and [rationale](RATIONALE.md): open ordinary files, inspect them, attach precise comments, and save feedback an existing agent can use. Both interfaces should make content easy to consume and commenting easy to do.

## One local application with two interfaces

Use a shared Rust review core, a terminal interface, and a small browser frontend. The core owns file snapshots, comment targets, review state, and feedback persistence. Interfaces own presentation, navigation, and input.

- **TUI:** calls the core directly within the application process. Reviewing in the terminal does not require starting a server.
- **Browser:** communicates with the same core through a local HTTP adapter. The application serves the frontend and API together, and the server runs only for browser review.
- **Files and Git:** supply review content to the core. Feedback is saved as ordinary JSON; revising the source files remains in the user's existing tools.

Start with modules in one Rust application and library, plus a frontend directory. These boundaries should keep review logic independent of either UI without requiring services, plugins, or a large crate hierarchy.

## Proposed stack

| Area | Choice | Purpose |
| --- | --- | --- |
| Application and core | Rust, with Clap for the CLI | One native executable and explicit types for content, targets, and comments. |
| Terminal interface | [Ratatui and Crossterm](https://ratatui.rs/concepts/backends/) | Text layout, highlighting, scrolling, keyboard input, and terminal lifecycle. |
| Local browser server | [Axum](https://docs.rs/axum/latest/axum/) with Tokio | Serve bundled assets and a small JSON API. |
| Browser interface | TypeScript, [Svelte](https://svelte.dev/docs/svelte/overview), and [Vite](https://vite.dev/guide/) | Manage selection, comment input, and navigation in a small client application. |
| Feedback | Serde and JSON | A readable, versioned format shared by both interfaces. |
| Markdown | [pulldown-cmark](https://docs.rs/pulldown-cmark/latest/pulldown_cmark/struct.Parser.html) | Parse Markdown with source offsets that support comment targeting. |
| Git context | Installed Git executable | Obtain comparisons and revisions through read-only commands. Git remains optional for standalone files. |

Rust is a good fit for the native CLI and TUI, local file handling, and a core reused by both interfaces. The tradeoff is Rust's development and compile-time cost, plus a separate frontend toolchain. Keeping the browser in TypeScript lets us use its native document and selection APIs. Svelte is proposed to keep UI state manageable as comments and navigation interact.

The release should bundle the built frontend into the executable. Users need neither Node nor a separate backend installation. Exact dependency versions and packaging mechanics can wait until implementation.

## Precise comments across both interfaces

A comment refers to reviewed content, independently of how it is displayed. Its target should identify the file, reviewed version, source range, and quoted content with surrounding context. Diff targets also identify the old or new side. The core defines the coordinate convention; each interface translates its selections into that convention.

Use stable snapshots during review. If a file changes, show that fact and keep existing comments attached to the original content. Moving comments to a revision must be explicit; changed content does not imply a resolved concern.

Start with lines and line ranges in the TUI. The browser can offer passage selection where it maps reliably to source. Markdown formatting and wrapping must preserve that mapping; parser offsets help but do not provide a complete selection solution. A source view remains available when formatted selection would be ambiguous.

## Simple operation and persistence

Propose the TUI as the default for an interactive terminal, with an explicit browser option, such as `review --browser file.md`. Without an interactive terminal, ask for an explicit mode through a clear CLI message. Both surfaces offer the same actions: inspect, select, add or revisit comments, and save feedback.

Keep active review state in memory and make saved feedback reopenable in either interface. Use an explicit, visible save destination, defaulting to the invocation directory, and avoid overwriting unrelated files. A database and background daemon are unnecessary for this initial workflow. Draft recovery can be decided separately.

The browser server binds to loopback and exposes only content selected for the review. Session access checks protect local operations, and document content is rendered without executing embedded scripts. Browser assets should work offline.

## Initial scope and decisions to agree on

The first complete slice is a single text file: inspect, comment, save, reopen, and review after revision in both interfaces. Multiple files and unified Git diffs follow in the early scope. Images and PDFs follow later through the browser. Each step should improve the review loop rather than add editing, agent execution, or project management.

Before writing code, agree on:

1. Rust for the shared core and application, with a TypeScript and Svelte browser frontend.
2. Direct core access for the TUI and local HTTP access for the browser, with shared comment semantics and JSON feedback.
3. Terminal by default, browser by explicit choice, and simple text targeting before richer rendering.
4. Explicit feedback saves and reopening first; whether automatic draft recovery belongs in the first release.

API endpoints, exact schemas, keybindings, and detailed module layouts should follow these decisions and the smallest complete commenting interaction.
