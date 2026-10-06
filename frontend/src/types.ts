// Shapes of the local review API; see src/http.rs.

export type Side = 'source' | 'old' | 'new';

export type Snapshot = { id: string; side: Side; revision: string; sha256: string; text: string };

export type DiffRow = {
  kind: 'hunk' | 'context' | 'delete' | 'add' | 'note';
  text: string;
  old_line: number | null;
  new_line: number | null;
};

/** `diff` is set for Git changes and null for opened files. */
export type ReviewFile = { id: string; path: string; snapshots: Snapshot[]; diff: DiffRow[] | null };

/** A UTF-8 byte range `[start_byte, end_byte)` of one snapshot. */
export type Selection = { snapshot_id: string; start_byte: number; end_byte: number };

export type Target = Selection & {
  file_id: string;
  path: string;
  side: Side;
  start_line: number;
  end_line: number;
  quote: string;
  before: string;
  after: string;
};

export type Comment = { id: string; target: Target; body: string; created_at: number; updated_at: number };

export type DiskState = {
  file_id: string;
  status: 'detached' | 'unchanged' | 'changed' | 'missing' | 'unavailable';
  message: string;
  diff: DiffRow[];
};

/** Reviewed content, fixed for the session. */
export type Content = { files: ReviewFile[]; previews: { snapshot_id: string; html: string }[] };

/** Mutable review state, returned by every other API call. */
export type ReviewState = {
  comments: Comment[];
  disk: DiskState[];
  dirty: boolean;
  output: string;
  last_saved: string | null;
};

/** How the content pane presents the current file. */
export type Mode = 'source' | 'diff' | 'preview' | 'revisions';
