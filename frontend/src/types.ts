export type Snapshot = { id: string; side: 'source' | 'old' | 'new'; revision: string; sha256: string; text: string };
export type DiffRow = { kind: 'hunk' | 'context' | 'delete' | 'add' | 'note'; text: string; old_line: number | null; new_line: number | null };
export type ReviewFile = { id: string; path: string; snapshots: Snapshot[]; diff: DiffRow[] | null };
export type Target = { file_id: string; path: string; snapshot_id: string; side: Snapshot['side']; start_byte: number; end_byte: number; start_line: number; end_line: number; quote: string; before: string; after: string };
export type Comment = { id: string; target: Target; body: string; created_at: number; updated_at: number };
export type DiskState = { file_id: string; status: 'detached' | 'unchanged' | 'changed' | 'missing' | 'unavailable'; message: string; diff: DiffRow[] };
/** Reviewed content; fixed for the session. */
export type Content = { files: ReviewFile[]; previews: { snapshot_id: string; html: string }[] };
/** Mutable review state returned by every other API call. */
export type State = { comments: Comment[]; disk: DiskState[]; dirty: boolean; output: string; last_saved: string | null };
