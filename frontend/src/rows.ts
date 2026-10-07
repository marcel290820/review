// The rows a view shows, built once per file and view: snapshot lines, diff rows, or
// disk revision rows, each with what its gutter numbers and text target.

import { sourceLines, type Line } from './lines';
import type { DiffRow, DiskState, MarkdownView, ReviewFile, Side, Snapshot } from './types';

/** How the content shows the current file. `main` is the diff of a Git change, else its source. */
export type View = 'main' | 'old' | 'new' | 'preview' | 'disk';

/** A numbered line in a gutter column. Disk revisions show numbers that target nothing. */
export type Place = { side: Side; line: number; snapshot: Snapshot | null };

export type Row = {
  kind: 'line' | DiffRow['kind'];
  text: string;
  /** One gutter column for a snapshot; old and new columns for a diff. */
  places: (Place | null)[];
  /** Where a comment on this row's text lands, with the byte its line starts at. */
  target: { snapshot: Snapshot; line: number; start: number } | null;
  /** Markdown marks of `text`, as `start, end, flags` triples in bytes. */
  marks?: number[];
  changes?: { start: number; end: number }[];
};

const linesCache = new WeakMap<Snapshot, Line[]>();

/** The lines of a snapshot, computed once. */
export function linesOf(snapshot: Snapshot): Line[] {
  let lines = linesCache.get(snapshot);
  if (!lines) linesCache.set(snapshot, (lines = sourceLines(snapshot.text)));
  return lines;
}

export function sideOf(file: ReviewFile, side: Side): Snapshot | undefined {
  return file.snapshots.find((s) => s.side === side);
}

/** The views a file offers, in the order `b` cycles through them. */
export function viewsOf(file: ReviewFile, markdown: boolean): View[] {
  const views: View[] = ['main'];
  if (file.diff) views.push(...file.snapshots.map((s) => s.side as View));
  if (markdown) views.push('preview');
  return views;
}

/** The snapshot a source view or preview shows: the opened file, or one diff side. */
export function snapshotOf(file: ReviewFile, view: View): Snapshot | undefined {
  if (view === 'old' || view === 'new') return sideOf(file, view);
  return file.snapshots.at(-1);
}

export function buildRows(
  file: ReviewFile,
  view: View,
  contextSide: 'old' | 'new',
  markdown: Map<string, MarkdownView>,
): Row[] {
  if (view === 'preview' || view === 'disk') return [];
  if (view === 'main' && file.diff) return diffRows(file.diff, file, contextSide, markdown);
  const snapshot = snapshotOf(file, view);
  if (!snapshot) return [];
  const marks = markdown.get(snapshot.id)?.marks;
  return linesOf(snapshot).map((line) => ({
    kind: 'line',
    text: line.text,
    places: [{ side: snapshot.side, line: line.number, snapshot }],
    target: { snapshot, line: line.number, start: line.start },
    marks: marks?.[line.number - 1],
  }));
}

function diffRows(
  diff: DiffRow[],
  file: ReviewFile,
  contextSide: 'old' | 'new',
  markdown: Map<string, MarkdownView>,
): Row[] {
  const sides = { old: sideOf(file, 'old') ?? null, new: sideOf(file, 'new') ?? null };
  const place = (side: 'old' | 'new', line: number | null): Place | null =>
    line === null ? null : { side, line, snapshot: sides[side] };
  if (diff.length === 0) {
    return [{ kind: 'note', text: 'No textual changes. Press b for the full old and new sources.', places: [null, null], target: null }];
  }
  return diff.map((row) => {
    const places = [place('old', row.old_line), place('new', row.new_line)];
    const side = row.kind === 'delete' ? 'old' : row.kind === 'add' ? 'new' : row.kind === 'context' ? contextSide : null;
    const at = side && places[side === 'old' ? 0 : 1];
    const snapshot = at?.snapshot;
    // Context text is the same on both sides, so either side's marks style it.
    const styled = row.kind === 'delete' ? places[0] : (places[1] ?? places[0]);
    const marks = styled?.snapshot && markdown.get(styled.snapshot.id)?.marks?.[styled.line - 1];
    return {
      kind: row.kind,
      text: row.text,
      places,
      target: at && snapshot ? { snapshot, line: at.line, start: linesOf(snapshot)[at.line - 1].start } : null,
      marks: marks || undefined,
      changes: row.changes,
    };
  });
}

/** Read-only rows of a disk revision diff. */
export function diskRows(disk: DiskState | undefined): Row[] {
  if (!disk?.diff.length) return [{ kind: 'note', text: disk?.message ?? 'No disk revision.', places: [null, null], target: null }];
  return disk.diff.map((row) => ({
    kind: row.kind,
    text: row.text,
    places: [
      row.old_line === null ? null : { side: 'old', line: row.old_line, snapshot: null },
      row.new_line === null ? null : { side: 'new', line: row.new_line, snapshot: null },
    ],
    target: null,
    changes: row.changes,
  }));
}
