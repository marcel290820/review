// Line and byte arithmetic matching the Rust core: targets are UTF-8 byte offsets,
// and a line ends after its '\n'.

/** One line of snapshot text; `end` includes the line's '\n'. */
export type Line = { number: number; start: number; end: number; text: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Bytes of `text` in UTF-8, without encoding it. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c < 0xdc00 && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/** The text of UTF-8 bytes `start..end`. */
export function utf8Slice(text: string, start: number, end: number): string {
  return decoder.decode(encoder.encode(text).subarray(start, end));
}

/** Lines with byte ranges. An empty text has one empty line; a final '\n' adds none. */
export function sourceLines(text: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const raw of text.match(/[^\n]*\n|[^\n]+$/g) ?? ['']) {
    const end = start + utf8Length(raw);
    lines.push({ number: lines.length + 1, start, end, text: raw.replace(/\n$/, '') });
    start = end;
  }
  return lines;
}

/** The byte range covering lines `first` to `last`, inclusive and one-based. */
export function lineRange(lines: Line[], first: number, last: number): { start_byte: number; end_byte: number } {
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > lines.length) {
    throw new Error('Choose an existing line range');
  }
  return { start_byte: lines[first - 1].start, end_byte: lines[last - 1].end };
}

/** The first and last line numbers that bytes `start..end` touch. */
export function lineSpan(lines: Line[], start: number, end: number): [number, number] {
  const numberOf = (found: Line | undefined) => (found ?? lines[lines.length - 1]).number;
  return [numberOf(lines.find((l) => l.end > start)), numberOf(lines.find((l) => l.end >= end))];
}

/** Maps UTF-8 byte offsets within `text` to UTF-16 indices. */
export function byteIndex(text: string): (byte: number) => number {
  if (utf8Length(text) === text.length) return (byte) => Math.min(byte, text.length);
  const index: number[] = [];
  for (let i = 0; i < text.length; ) {
    const units = text.codePointAt(i)! > 0xffff ? 2 : 1;
    for (let n = utf8Length(text.slice(i, i + units)); n > 0; n--) index.push(i);
    i += units;
  }
  index.push(text.length);
  return (byte) => index[Math.min(byte, index.length - 1)];
}

/** A run of line text with its Markdown flags and whether its words changed. */
export type Segment = { text: string; flags: number; changed: boolean };

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Snaps UTF-16 indices to the edges of user-perceived characters: starts move back, ends forward. */
function characterEdges(text: string): { start: (index: number) => number; end: (index: number) => number } {
  if (/^[\x00-\x7f]*$/.test(text)) return { start: (index) => index, end: (index) => index };
  const edges = [...[...graphemes.segment(text)].map((g) => g.index), text.length];
  // The first edge at or after `index`, by binary search.
  const after = (index: number) => {
    let [low, high] = [0, edges.length - 1];
    while (low < high) {
      const middle = (low + high) >> 1;
      if (edges[middle] < index) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  return {
    start: (index) => {
      const at = after(index);
      return edges[at] === index ? index : edges[Math.max(at - 1, 0)];
    },
    end: (index) => edges[after(index)],
  };
}

/**
 * `text` cut where Markdown `marks` (`start, end, flags` triples) and `changes` begin or end,
 * both in UTF-8 bytes and sorted, as the server sends them. A cut inside a user-perceived
 * character moves to its edge, so styles never split one, and a change touching part of a
 * character marks all of it. Linear in the marks, so long lines stay cheap.
 */
export function segments(text: string, marks: number[] = [], changes: { start: number; end: number }[] = []): Segment[] {
  if (marks.length === 0 && changes.length === 0) return [{ text, flags: 0, changed: false }];
  const at = byteIndex(text);
  const edges = characterEdges(text);
  const [start, end] = [(byte: number) => edges.start(at(byte)), (byte: number) => edges.end(at(byte))];
  const marked: number[][] = [];
  for (let i = 0; i + 2 < marks.length; i += 3) marked.push([start(marks[i]), end(marks[i + 1]), marks[i + 2]]);
  const changed = changes.map((c) => [start(c.start), end(c.end)]);
  const cuts = [...new Set([0, text.length, ...marked.flatMap(([s, e]) => [s, e]), ...changed.flat()])]
    .filter((cut) => cut <= text.length)
    .sort((a, b) => a - b);
  // Marks and changes are sorted, so one cursor each finds a segment's own.
  let [m, c] = [0, 0];
  const result: Segment[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [s, e] = [cuts[i], cuts[i + 1]];
    if (s === e) continue;
    while (m < marked.length && marked[m][1] <= s) m++;
    while (c < changed.length && changed[c][1] <= s) c++;
    const flags = m < marked.length && marked[m][0] <= s ? marked[m][2] : 0;
    result.push({ text: text.slice(s, e), flags, changed: c < changed.length && changed[c][0] <= s });
  }
  return result;
}

/**
 * The snapshot byte offset of a DOM point, or null outside reviewed text. Line text is
 * rendered in an element carrying `data-start` (the line's first byte) and `data-snapshot`,
 * inside a `.row`. A point elsewhere in a row counts as the start or end of its text, and a
 * point between rows or in a comment as the end of the row before it, so a drag may end
 * past the end of a line.
 */
export function selectionPoint(node: Node, offset: number): { snapshot_id: string; byte: number } | null {
  const element = node instanceof Element ? node : node.parentElement;
  let row = element?.closest<HTMLElement>('.row') ?? null;
  let atEnd = false;
  if (!row && element) {
    const before = element.closest('.note, .composer') ?? (node === element ? node.childNodes[offset - 1] : null);
    row = rowBefore(before);
    atEnd = true;
  }
  const span = row?.querySelector<HTMLElement>('[data-start][data-snapshot]');
  if (!span) return null;
  const text = span.textContent ?? '';
  let units: number;
  if (!atEnd && span.contains(node)) {
    const range = document.createRange();
    range.setStart(span, 0);
    range.setEnd(node, offset);
    units = range.toString().length;
  } else {
    atEnd ||= Boolean(span.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    units = atEnd ? text.length : 0;
  }
  return { snapshot_id: span.dataset.snapshot!, byte: Number(span.dataset.start) + utf8Length(text.slice(0, units)) };
}

/** The last row in or before `node`. */
function rowBefore(node: Node | null | undefined): HTMLElement | null {
  for (let at = node; at; at = at.previousSibling) {
    if (!(at instanceof HTMLElement)) continue;
    if (at.classList.contains('row')) return at;
    const rows = at.querySelectorAll<HTMLElement>('.row');
    if (rows.length) return rows[rows.length - 1];
  }
  return null;
}
