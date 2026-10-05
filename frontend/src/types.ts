export type Snapshot = { id: string; side: 'source' | 'old' | 'new'; revision: string; sha256: string; text: string };
export type DiffRow = { kind: string; text: string; old_line: number | null; new_line: number | null };
export type ReviewFile = { id: string; path: string; snapshots: Snapshot[]; diff: DiffRow[] | null };
export type Target = { file_id: string; path: string; snapshot_id: string; side: string; start_byte: number; end_byte: number; start_line: number; end_line: number; quote: string; before: string; after: string };
export type Comment = { id: string; target: Target; body: string };
export type View = { feedback: { files: ReviewFile[]; comments: Comment[] }; revisions: { file_id: string; state: string; message: string; text: string | null; diff: DiffRow[] }[]; revision: number; dirty: boolean; output: string; last_saved: string | null; previews: { snapshot_id: string; html: string }[] };
