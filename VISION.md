# Vision

Review is a local tool for inspecting files in a terminal UI or browser GUI, attaching precise comments, and saving feedback that an AI agent can act on.

It fits into the workflow the user already has. The user keeps their terminal, editor, Git tooling, and choice of agent. Review provides a simple review surface in the terminal or browser for the moment when they need to inspect work and explain what should change. Engineers working with agents often spend most of their time in the terminal; they should be able to review and comment there without switching tools.

## The experience

```text
Open files -> inspect -> attach comments -> save feedback -> revise
```

The entry point is a command such as:

```sh
review some-doc.md
```

The command opens a local review interface, with a terminal UI and browser GUI as first-class options. In either interface, the user reads the document, attaches comments to relevant passages, and saves the same structured feedback for their agent. They can return to inspect the revised work.

Commenting is the focus. Content should be easy to scan, targets easy to identify, and comments easy to write and revisit. The TUI uses simple rendering and direct keyboard interaction. The browser follows the same principles, with pointer selection and richer rendering where they help inspection. Both keep controls and decoration to a minimum.

The same idea extends to multiple files and Git diffs. Each kind of content should have a presentation and commenting interaction suited to reviewing it. Text documents come first; images and PDFs follow.

## What must stay true

- **Easy to enter.** Opening existing files is enough to start. No account, workspace creation, upload, or agent integration is required.
- **Easy to leave.** Files stay ordinary files. Feedback is portable, readable outside Review, and useful to any agent.
- **Precise feedback.** Comments carry enough location and content context to identify what the user means.
- **Two useful review surfaces.** The TUI supports review within terminal workflows; the browser GUI supports review with keyboard and pointer interaction. Both share the same commenting and feedback model.
- **Simple and readable.** Show the content and comments clearly. Reading, navigating, selecting, and commenting should require little effort. Rendering and controls serve those tasks; visual clutter and unrelated features do not.
- **Local by default.** Reviewing work keeps its content on the user's machine.
- **Fits existing tools.** Review works alongside the user's editor and agent. Git adds useful review context but is optional.

## Product boundary

Review owns the inspection and feedback interaction. Editing and executing work remain in the user's existing tools.

New capabilities should make it easier to inspect work or communicate a requested change. Features that require users to reorganize their work around Review undermine its purpose.

The measure of success is whether users can inspect work and give actionable feedback with less effort than their current workflow.
