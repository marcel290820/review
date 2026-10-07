# Feedback format

See [examples/feedback.json](../examples/feedback.json) for a complete readable example. The format is `review.feedback`, version `1`:

- `files` contain relative paths, stable IDs, complete reviewed snapshots, and SHA-256 hashes. A file has one `source` snapshot, or an `old` and/or `new` snapshot for a Git change. The interfaces compute unified diffs from those snapshots; diffs are not stored.
- Each comment identifies its file, snapshot, side (`source`, `old`, or `new`), selected quote, surrounding context, and requested change.
- `start_byte` and `end_byte` are zero-based UTF-8 byte offsets forming a half-open range `[start_byte, end_byte)`. They refer to that snapshot's exact bytes, including CRLF. Line numbers are one-based and inclusive. Empty-file targets use `[0, 0)`.
- Comment editing changes the body while preserving the target. Deletion is explicit. There is no inferred resolution or automatic relocation.
- Reopening rejects unsupported versions, unknown fields, duplicate identifiers, invalid checksums, invalid UTF-8 boundaries, mismatched quotes/context, and files that mix source and diff snapshots.
- Saves use a temporary file, sync it, and publish it without replacing an existing filename. Concurrent saves receive distinct names.
