// Line and byte arithmetic matching the Rust core: targets are UTF-8 byte offsets,
// and a line ends after its '\n'.

/** One line of snapshot text; `end` includes the line's '\n'. */
export type Line = { number: number; start: number; end: number; text: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8Length(text: string): number {
  return encoder.encode(text).length;
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

/**
 * The snapshot byte offset of a DOM selection point, or null outside source text.
 * Source text is rendered in spans carrying `data-snapshot` and `data-start`, the
 * byte offset of their first character.
 */
export function selectionPoint(node: Node, offset: number): { snapshot_id: string; byte: number } | null {
  const element = node instanceof Element ? node : node.parentElement;
  const span = element?.closest<HTMLElement>('[data-start][data-snapshot]');
  const snapshot = span?.dataset.snapshot;
  if (!span || snapshot === undefined || (node !== span && node !== span.firstChild)) return null;
  const text = span.textContent ?? '';
  // In the text node, offsets count UTF-16 code units; on the span, child nodes.
  const units = node === span ? (offset === 0 ? 0 : text.length) : offset;
  if (units > text.length) return null;
  return { snapshot_id: snapshot, byte: Number(span.dataset.start) + utf8Length(text.slice(0, units)) };
}
