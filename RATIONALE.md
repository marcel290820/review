# Rationale

## The problem

AI agents can produce substantial amounts of work in ordinary files: plans, requirements, documentation, source code, logs, and other outputs. The human still needs to read that work, judge it, and explain what should change.

Existing terminal and editor workflows make files accessible, but feedback often requires manual translation. The user identifies a passage, copies it into chat, adds a file reference, and explains its location. With several files, that process becomes repetitive and easy to get wrong.

Review reduces this translation. The user comments where they are looking, and the tool carries the relevant context into feedback for the agent.

## Why a browser GUI

The target user is technically capable and already comfortable with terminal commands. They do not need another environment to manage their development workflow. They do need a convenient surface for reading formatted documents, inspecting changes, and attaching comments.

A command provides the entry point; the browser provides the GUI. This combines familiar file-oriented invocation with selection, rendering, and navigation that are awkward in a terminal.

The interface should earn its place through useful interactions and low friction. Technical users should be able to open a file and understand the review flow immediately.

## Why ordinary files remain central

Review should accept work where it already exists. Users should not have to publish artifacts into a separate platform, create a project record, identify the producing agent, or adopt a prescribed review lifecycle.

The basic unit is a comment on content the user inspected. A collection of comments becomes feedback. Additional concepts are justified only when they solve a demonstrated problem in that interaction.

The tool is especially useful for agent-produced work, but the origin of a file does not determine whether it can be reviewed.

## Why portable feedback matters

Avoiding lock-in means more than supporting an export command. The normal workflow must remain useful without Review controlling the agent, storing the project's canonical files, or becoming the place where all work happens.

The initial handoff is a JSON file. An agent can read it through ordinary file access, and the user can inspect or process it with existing tools. Comments should include the file reference, target or selected passage, relevant content context, and the requested change.

For example, a user might invoke:

```sh
review some-doc.md
```

They review the document in the browser, attach comments, and save a feedback JSON file in the directory where they invoked the command. They then tell their existing agent to read that file and address the feedback.

This example establishes the desired simplicity. It does not fix the output filename, schema, or exact command options. The save location should be clear and controllable, and saving feedback must not silently overwrite unrelated files.

Agent-specific integrations may later remove repeated steps. The file-based workflow must remain complete on its own.

## Why text and diffs come first

Text documents cover a broad range of useful work: Markdown, plain text, plans, specifications, source code, structured text such as JSON or YAML, and logs. The first version should make this family of content comfortable to inspect and comment on.

Rendered documents and source views serve different purposes. A plan benefits from readable formatting; code and logs benefit from clear line references. Comments should work with the presentation the user is reviewing.

Git diffs belong in the early scope because users often need to judge what changed, rather than reread an entire file. Git supplies comparison context; it should not be required for reviewing a standalone document.

Images and PDFs extend the same interaction later. They introduce different viewing and targeting needs, so they should follow a useful text review loop rather than delay it.

## Why review stays separate from editing

The user already has tools for editing files and running agents. Adding code editing, a terminal, agent execution, or project management would increase the setup and interface burden without proving the core idea.

Review should make it easier to inspect a result and express a correction. It does not need to perform that correction itself.

## Why content context must be trustworthy

Files may change after a comment is written. Feedback must still make clear which content the user reviewed. A location reference alone can become misleading when lines move or content is replaced.

The first design should preserve enough context to interpret feedback accurately. It should keep changes visible and avoid silently moving comments onto unrelated content. A changed file does not establish that a concern was resolved.

The details of version retention and comment handling remain design work. They should support the simple workflow without turning Review into another version-control system.

## What to sharpen before implementation

The next design work should settle the smallest complete text review interaction: how users select a target, add and revisit comments, save feedback, and inspect a revision. It should also settle how multiple files and Git diffs fit into that same flow.

Output naming, the minimal JSON contract, and the treatment of changing content follow from those interactions. Runtime, storage, renderer libraries, and integration mechanisms should be chosen afterward.

The first useful result is a complete loop: open a document or diff, attach precise comments, save feedback, let an existing agent revise the files, and inspect the changes. Every initial feature should help that loop.
