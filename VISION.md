# Vision

Review is a local tool for inspecting files in the browser, attaching precise comments, and saving feedback that an AI agent can act on.

It fits into the workflow the user already has. The user keeps their terminal, editor, Git tooling, and choice of agent. Review provides a simple GUI for the moment when they need to inspect work and explain what should change.

## The experience

```text
Open files -> inspect -> attach comments -> save feedback -> revise
```

The entry point is a command such as:

```sh
review some-doc.md
```

The command starts a local browser interface. The user reads the document, attaches comments to relevant passages, and saves structured feedback for their agent. They can return to inspect the revised work.

The same idea extends to multiple files and Git diffs. Each kind of content should have a presentation and commenting interaction suited to reviewing it. Text documents come first; images and PDFs follow.

## What must stay true

- **Easy to enter.** Opening existing files is enough to start. No account, workspace creation, upload, or agent integration is required.
- **Easy to leave.** Files stay ordinary files. Feedback is portable, readable outside Review, and useful to any agent.
- **Precise feedback.** Comments carry enough location and content context to identify what the user means.
- **A useful browser GUI.** Reading, navigating, selecting, and commenting should require little effort. Keyboard and pointer interaction both matter.
- **Local by default.** Reviewing work keeps its content on the user's machine.
- **Fits existing tools.** Review works alongside the user's editor and agent. Git adds useful review context but is optional.

## Product boundary

Review owns the inspection and feedback interaction. Editing and executing work remain in the user's existing tools.

New capabilities should make it easier to inspect work or communicate a requested change. Features that require users to reorganize their work around Review undermine its purpose.

The measure of success is whether users can inspect work and give actionable feedback with less effort than their current workflow.
