// The review in the browser: content, comments, what is chosen, and every action the
// keys and pointer can take. Components read this state; only these actions change it.

import { tick } from 'svelte';
import { api, Responses } from './api';
import { lineRange, lineSpan, utf8Length, utf8Slice } from './lines';
import { buildRows, diskRows, linesOf, snapshotOf, viewsOf, type Row, type View } from './rows';
import type { Comment, Content, ReviewFile, ReviewState, Snapshot } from './types';

/** Rows per chunk. The browser skips the layout of chunks out of view. */
export const CHUNK = 200;
/** Chunks drawn at once. Files up to `EAGER_ROWS` draw the rest right after, so the
 * browser's find sees every line; larger ones draw chunks as they near the view. */
const FIRST_CHUNKS = 3;
export const EAGER_ROWS = 4000;
const REFRESH_INTERVAL = 2500;

/** A comment target being chosen: whole lines, or a passage dragged in their text. */
export type Choice = {
  snapshot: Snapshot;
  start: number;
  end: number;
  first: number;
  last: number;
  /** The rows of the current view the target spans. */
  rows: [number, number];
  passage: boolean;
};

export type Draft = { body: string; editing: Comment | null };

/**
 * A chunk of rows and its share of the review state. Rows read only their chunk's share,
 * which changes only when the chunk is affected, so choosing a line or moving the cursor
 * updates two chunks rather than every row of a large file.
 */
export class Part {
  mounted = $state(false);
  /** Selected rows, the cursor, the comment button, and the composer, as indices into `rows`. */
  from = $state(-1);
  to = $state(-1);
  cursor = $state(-1);
  pill = $state(-1);
  draft = $state(-1);
  /** Where the whole selection begins and ends, when that is in this chunk. */
  first = $state(-1);
  last = $state(-1);
  threads = $state.raw(new Map<number, Comment[]>());
  covered = $state.raw(new Set<number>());
  #covered = '';

  constructor(
    readonly start: number,
    readonly rows: Row[],
  ) {
    this.mounted = start < FIRST_CHUNKS * CHUNK;
  }

  get end() {
    return this.start + this.rows.length;
  }

  local(row: number | null | undefined): number {
    return row != null && row >= this.start && row < this.end ? row - this.start : -1;
  }

  /** Takes the part of the selection, cursor, button, and composer inside this chunk. */
  mark(selected: [number, number] | null, cursor: number, pill: number, draft: number) {
    const inside = selected !== null && selected[0] < this.end && selected[1] >= this.start;
    this.from = inside ? Math.max(selected[0] - this.start, 0) : -1;
    this.to = inside ? Math.min(selected[1] - this.start, this.rows.length - 1) : -1;
    this.first = this.local(selected?.[0]);
    this.last = this.local(selected?.[1]);
    this.cursor = this.local(cursor);
    this.pill = this.local(pill);
    this.draft = this.local(draft);
  }

  /** Takes the comments hanging in this chunk and the rows they cover, when they changed.
   * Every new review state brings new comment objects, so identity shows any edit. */
  comment(threads: Map<number, Comment[]>, covered: Set<number>) {
    const mine = new Map<number, Comment[]>();
    for (const [row, comments] of threads) if (this.local(row) >= 0) mine.set(row - this.start, comments);
    const same =
      mine.size === this.threads.size &&
      [...mine].every(([row, comments]) => {
        const before = this.threads.get(row);
        return before?.length === comments.length && comments.every((c, i) => c === before[i]);
      });
    if (!same) this.threads = mine;
    const rows = new Set<number>();
    for (let i = 0; i < this.rows.length; i++) if (covered.has(this.start + i)) rows.add(i);
    const coveredKey = [...rows].join();
    if (coveredKey !== this.#covered) [this.#covered, this.covered] = [coveredKey, rows];
  }
}
export type Card = 'comments' | 'keys';

class Review {
  content = $state.raw<Content | null>(null);
  state = $state.raw<ReviewState | null>(null);
  fileIndex = $state(0);
  view = $state<View>('main');
  contextSide = $state<'old' | 'new'>('new');
  /** The row the keys act on, and where a key selection started. */
  cursor = $state(0);
  anchor = $state<number | null>(null);
  /** Set once keys move the cursor, so pointer users never see it. */
  keyboard = $state(false);
  choice = $state.raw<Choice | null>(null);
  draft = $state<Draft | null>(null);
  card = $state<Card | null>(null);
  /** The comment chosen in the comments card, in reading order. */
  listed = $state(0);
  notice = $state.raw<{ text: string; error: boolean } | null>(null);
  busy = $state(false);

  file = $derived(this.content?.files[this.fileIndex]);
  markdown = $derived(new Map((this.content?.markdown ?? []).map((m) => [m.snapshot_id, m])));
  comments = $derived(this.state?.comments ?? []);
  views = $derived(this.file ? viewsOf(this.file, this.markdown.has(this.file.snapshots.at(-1)?.id ?? '')) : []);
  disk = $derived(this.state?.disk.find((d) => d.file_id === this.file?.id));
  rows: Row[] = $derived.by(() => {
    if (!this.file) return [];
    if (this.view === 'disk') return diskRows(this.disk);
    return buildRows(this.file, this.view, this.contextSide, this.markdown);
  });
  parts = $derived.by(() => {
    const parts: Part[] = [];
    for (let start = 0; start < this.rows.length; start += CHUNK) {
      parts.push(new Part(start, this.rows.slice(start, start + CHUNK)));
    }
    return parts;
  });
  /** The row showing each `side:line` of the current view. */
  rowOf = $derived.by(() => {
    const rows = new Map<string, number>();
    this.rows.forEach((row, i) => {
      for (const place of row.places) if (place?.snapshot) rows.set(`${place.side}:${place.line}`, i);
    });
    return rows;
  });
  /** Comments hanging beneath each row, and every row a comment covers. */
  threads = $derived.by(() => {
    const threads = new Map<number, Comment[]>();
    const covered = new Set<number>();
    if (this.view === 'disk') return { threads, covered };
    for (const comment of this.inReadingOrder) {
      const t = comment.target;
      if (t.file_id !== this.file?.id) continue;
      const end = this.rowOf.get(`${t.side}:${t.end_line}`);
      if (end === undefined) continue;
      threads.set(end, [...(threads.get(end) ?? []), comment]);
      for (let line = t.start_line; line <= t.end_line; line++) {
        const row = this.rowOf.get(`${t.side}:${line}`);
        if (row !== undefined) covered.add(row);
      }
    }
    return { threads, covered };
  });
  inReadingOrder = $derived.by(() => {
    const order = new Map(this.content?.files.map((f, i) => [f.id, i]));
    return [...this.comments].sort((a, b) => {
      const [x, y] = [a.target, b.target];
      return (
        order.get(x.file_id)! - order.get(y.file_id)! ||
        Number(x.side === 'new') - Number(y.side === 'new') ||
        x.start_line - y.start_line ||
        x.end_line - y.end_line
      );
    });
  });
  /** The rows of the comment chosen in the comments card, when this view shows it. */
  listedRows = $derived.by((): [number, number] | null => {
    const t = this.card === 'comments' ? this.inReadingOrder[this.listed]?.target : undefined;
    if (!t || t.file_id !== this.file?.id || this.view === 'disk') return null;
    const [first, last] = [this.rowOf.get(`${t.side}:${t.start_line}`), this.rowOf.get(`${t.side}:${t.end_line}`)];
    return first === undefined || last === undefined ? null : [first, last];
  });
  /** Rows shown as selected: the comment chosen in the list, a key selection in progress,
   * or a chosen target. */
  selected = $derived.by((): [number, number] | null => {
    if (this.listedRows) return this.listedRows;
    if (this.anchor !== null) return [Math.min(this.anchor, this.cursor), Math.max(this.anchor, this.cursor)];
    return this.choice?.rows ?? null;
  });
  /** The row a new draft hangs beneath, or an edited comment's row. */
  draftRow = $derived.by(() => {
    if (!this.draft) return null;
    const editing = this.draft.editing?.target;
    if (editing) return this.rowOf.get(`${editing.side}:${editing.end_line}`) ?? null;
    return this.choice?.rows[1] ?? null;
  });
  /** True when the comment being edited was deleted elsewhere, such as in another tab. */
  editingGone = $derived.by(() => {
    const id = this.draft?.editing?.id;
    return id !== undefined && !this.comments.some((c) => c.id === id);
  });
  readOnly = $derived(this.view === 'disk' || this.view === 'preview');
  counts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const c of this.comments) counts.set(c.target.file_id, (counts.get(c.target.file_id) ?? 0) + 1);
    return counts;
  });

  #responses = new Responses();

  async start() {
    try {
      this.content = await api.content();
      this.showFile(0);
    } catch (error) {
      this.say(error, true);
    }
    void this.refresh();
    const timer = setInterval(() => {
      if (!this.busy && !document.hidden) void this.refresh();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }

  say(text: unknown, error = false) {
    this.notice = { text: text instanceof Error ? text.message : String(text), error };
  }

  async refresh() {
    const request = this.#responses.next();
    try {
      const next = this.#responses.accept(request, await api.refresh());
      if (next) this.state = next;
    } catch (error) {
      this.say(error, true);
    }
  }

  /** Applies a change on the server, one at a time. On failure, reloads the state and shows
   * the error. */
  async change(action: () => Promise<string>): Promise<boolean> {
    if (this.busy) {
      this.say('Wait for the current change to finish.', true);
      return false;
    }
    this.busy = true;
    const request = this.#responses.next();
    try {
      const next = this.#responses.accept(request, await action());
      if (next) this.state = next;
      return true;
    } catch (error) {
      await this.refresh();
      this.say(error, true);
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** True when no written draft would be lost, or the user agrees to discard it. */
  draftDiscarded(): boolean {
    if (this.draft?.body.trim() && !confirm('Discard this comment draft?')) return false;
    this.draft = null;
    return true;
  }

  showFile(index: number, view: View = 'main') {
    if (!this.content || !this.draftDiscarded()) return;
    this.fileIndex = index;
    this.view = view;
    this.reset();
  }

  setView(view: View) {
    if (view === this.view || !this.draftDiscarded()) return;
    this.view = view;
    this.reset();
  }

  /** Forgets what was chosen; used whenever the rows change. */
  reset() {
    this.choice = null;
    this.anchor = null;
    this.cursor = 0;
  }

  /** Hands each chunk its share of the selection, cursor, button, and composer. */
  markParts() {
    const selected = this.selected;
    const cursor = this.keyboard ? this.cursor : -1;
    const pill = this.draft || this.readOnly ? -1 : (this.choice?.rows[1] ?? -1);
    // An edited comment's composer replaces its thread, unless the comment is gone.
    const draft = this.draft?.editing && !this.editingGone ? -1 : (this.draftRow ?? -1);
    for (const part of this.parts) part.mark(selected, cursor, pill, draft);
  }

  /** Hands each chunk its comments. */
  commentParts() {
    const { threads, covered } = this.threads;
    for (const part of this.parts) part.comment(threads, covered);
  }

  cycleView() {
    this.setView(this.views[(this.views.indexOf(this.view) + 1) % this.views.length] ?? 'main');
  }

  toggleDisk() {
    void this.refresh();
    this.setView(this.view === 'disk' ? 'main' : 'disk');
  }

  /** Draws the chunk of `row`, then scrolls it into view. */
  async reveal(row: number, block: ScrollLogicalPosition = 'nearest') {
    const part = this.parts[Math.floor(row / CHUNK)];
    if (part) part.mounted = true;
    await tick();
    document.getElementById(`r${row}`)?.scrollIntoView({ block });
  }

  move(to: number, extend = false) {
    this.keyboard = true;
    if (extend && this.anchor === null) this.anchor = this.cursor;
    this.cursor = Math.max(0, Math.min(to, this.rows.length - 1));
    void this.reveal(this.cursor);
  }

  /** Starts or ends a key selection at the cursor. */
  toggleSelecting() {
    if (this.keepsDraft()) return;
    this.anchor = this.anchor === null ? this.cursor : null;
    this.choice = null;
  }

  /** Chooses the side diff context lines target. */
  setContextSide(side: 'old' | 'new') {
    if (this.keepsDraft()) return;
    this.contextSide = side;
    this.choice = null;
    this.say(`Context lines now target the ${side} side.`);
  }

  /** True, with a notice, while a draft holds the current target. */
  keepsDraft(): boolean {
    if (this.draft) this.say('Record or cancel the comment draft first.', true);
    return this.draft !== null;
  }

  /** Chooses the line a gutter number shows; with `extend`, up to it from the chosen lines. */
  chooseLine(row: number, column: number, extend: boolean) {
    const place = this.rows[row]?.places[column];
    if (!place?.snapshot || this.draft?.editing) return;
    const previous = this.choice;
    let [first, last] = [place.line, place.line];
    if (extend && previous && !previous.passage && previous.snapshot === place.snapshot) {
      [first, last] = [Math.min(previous.first, first), Math.max(previous.last, last)];
    }
    [this.anchor, this.card] = [null, null];
    this.cursor = row;
    this.choose(place.snapshot, first, last);
  }

  /** Chooses whole lines `first` to `last` of a snapshot. */
  choose(snapshot: Snapshot, first: number, last: number) {
    const { start_byte, end_byte } = lineRange(linesOf(snapshot), first, last);
    this.choice = {
      snapshot,
      start: start_byte,
      end: end_byte,
      first,
      last,
      rows: [this.rowOf.get(`${snapshot.side}:${first}`) ?? 0, this.rowOf.get(`${snapshot.side}:${last}`) ?? 0],
      passage: false,
    };
  }

  /** Chooses a passage dragged in the text, from `start` to `end` bytes. */
  choosePassage(snapshotId: string, start: number, end: number) {
    const snapshot = this.file?.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot || this.readOnly || this.draft) return;
    const [first, last] = lineSpan(linesOf(snapshot), start, end);
    const row = (line: number) => this.rowOf.get(`${snapshot.side}:${line}`) ?? 0;
    [this.anchor, this.card] = [null, null];
    this.choice = { snapshot, start, end, first, last, rows: [row(first), row(last)], passage: true };
  }

  /** A rejected drag also drops the target an earlier, partial drag chose. */
  rejectPassage(text: string) {
    if (this.readOnly || this.draft) return;
    [this.choice, this.anchor] = [null, null];
    this.say(text, true);
  }

  /** Opens the composer on the chosen target, the key selection, or the cursor's line. */
  compose() {
    if (this.readOnly || this.draft) return;
    try {
      if (this.anchor !== null || !this.choice) this.chooseRows(...(this.selected ?? [this.cursor, this.cursor]));
    } catch (error) {
      this.say(error, true);
      return;
    }
    this.anchor = null;
    this.card = null;
    this.draft = { body: '', editing: null };
  }

  /** Chooses the lines rows `from` to `to` show, which must be reviewed lines of one side. */
  chooseRows(from: number, to: number) {
    const targets = this.rows.slice(from, to + 1).map((r) => r.target);
    const [first, last] = [targets[0], targets.at(-1)];
    if (!first || !last) throw new Error('Choose reviewed lines; hunk labels and revisions are read-only.');
    if (targets.some((t) => t && t.snapshot !== first.snapshot)) {
      throw new Error('Choose lines of one side; press b for the full old and new sources.');
    }
    this.choose(first.snapshot, first.line, last.line);
  }

  /** Shows a comment's file and target, optionally to edit it. */
  async goTo(comment: Comment, edit = false) {
    if (!this.content || !this.draftDiscarded()) return;
    const t = comment.target;
    const index = this.content.files.findIndex((f) => f.id === t.file_id);
    const file = this.content.files[index];
    // The diff shows the comment when its first and last lines are in hunks; otherwise its
    // side's full source does.
    const shows = (view: View) => {
      const lines = new Set<number>();
      for (const row of buildRows(file, view, this.contextSide, this.markdown)) {
        for (const p of row.places) if (p?.side === t.side) lines.add(p.line);
      }
      return lines.has(t.start_line) && lines.has(t.end_line);
    };
    const view: View = shows('main') ? 'main' : t.side === 'source' ? 'main' : t.side;
    if (index !== this.fileIndex || view !== this.view) this.showFile(index, view);
    this.anchor = null;
    const snapshot = file.snapshots.find((s) => s.id === t.snapshot_id)!;
    this.choose(snapshot, t.start_line, t.end_line);
    const lines = linesOf(snapshot);
    const whole = t.start_byte === lines[t.start_line - 1].start && t.end_byte === lines[t.end_line - 1].end;
    if (!whole) this.choice = { ...this.choice!, start: t.start_byte, end: t.end_byte, passage: true };
    this.card = null;
    this.draft = edit ? { body: comment.body, editing: comment } : null;
    const row = this.rowOf.get(`${t.side}:${t.end_line}`) ?? 0;
    this.cursor = row;
    await this.reveal(row, 'center');
  }

  async record() {
    const draft = this.draft;
    if (!draft || !this.file || !draft.body.trim() || this.busy) return;
    const [fileId, choice, body] = [this.file.id, this.choice, draft.body];
    let action: () => Promise<string>;
    if (draft.editing && this.editingGone) {
      // Deleted elsewhere: recording keeps the text as a new comment on the same target.
      const t = draft.editing.target;
      const target = { snapshot_id: t.snapshot_id, start_byte: t.start_byte, end_byte: t.end_byte };
      action = () => api.addComment(t.file_id, target, body);
    } else if (draft.editing) {
      const id = draft.editing.id;
      action = () => api.editComment(id, body);
    } else if (choice) {
      const target = { snapshot_id: choice.snapshot.id, start_byte: choice.start, end_byte: choice.end };
      action = () => api.addComment(fileId, target, body);
    } else return;
    if (await this.change(action)) {
      // The composer is read-only while recording, so the draft still holds what was sent.
      if (this.draft === draft) [this.draft, this.choice] = [null, null];
      this.say('Comment recorded. Press s to save feedback.');
    }
  }

  cancelDraft() {
    if (this.draftDiscarded()) this.choice = null;
  }

  async remove(comment: Comment) {
    if (!confirm('Delete this comment?')) return;
    if (await this.change(() => api.deleteComment(comment.id))) {
      if (this.draft?.editing?.id === comment.id) this.draft = null;
      this.listed = Math.min(this.listed, this.comments.length - 1);
      this.say('Comment deleted. Press s to save feedback.');
    }
  }

  async save() {
    if (this.draft?.body.trim()) {
      this.say('Record or cancel the comment draft before saving feedback.', true);
      return;
    }
    if (await this.change(api.save)) this.say(`Saved to ${this.state?.last_saved}`);
  }

  toggleCard(card: Card) {
    this.card = this.card === card ? null : card;
    if (card === 'comments') this.listed = Math.max(0, Math.min(this.listed, this.comments.length - 1));
  }

  /** The file a path shows, for labels. */
  fileOf(id: string): ReviewFile | undefined {
    return this.content?.files.find((f) => f.id === id);
  }
}

export const review = new Review();

/** `path:7-9`, with the diff side when there is one: the form editors and agents read. */
export function location(path: string, side: string, first: number, last: number): string {
  const lines = first === last ? `${first}` : `${first}–${last}`;
  return side === 'source' ? `${path}:${lines}` : `${path}:${lines} (${side})`;
}

/** The text a choice targets. Only its lines are encoded, not the whole snapshot. */
export function quoteOf(choice: Choice): string {
  const lines = linesOf(choice.snapshot).slice(choice.first - 1, choice.last);
  const text = lines.map((l) => l.text + (l.end - l.start > utf8Length(l.text) ? '\n' : '')).join('');
  return utf8Slice(text, choice.start - lines[0].start, choice.end - lines[0].start);
}
