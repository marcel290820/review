/** @param {string} text */
export function sourceLines(text) {
  let start = 0;
  return (text.match(/[^\n]*\n|[^\n]+$/g) || ['']).map((raw, index) => {
    const line = { start, end: start + new TextEncoder().encode(raw).length, text: raw.replace(/\n$/, ''), number: index + 1 };
    start = line.end;
    return line;
  });
}
/** @param {string} text @param {number} first @param {number} last */
export function lineRange(text, first, last) {
  const lines = sourceLines(text);
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > lines.length) throw Error('Choose an existing line range');
  return { start_byte: lines[first - 1].start, end_byte: lines[last - 1].end };
}
/** @param {Node} node @param {number} offset */
export function boundary(node, offset) {
  const element = node instanceof Element ? node : node.parentElement;
  const span = element?.closest('[data-start][data-snapshot]');
  if (!(span instanceof HTMLElement) || !(span === node || span.firstChild === node)) return null;
  const text = span.textContent || '';
  const utf16 = node === span ? (offset === 0 ? 0 : text.length) : offset;
  if (utf16 < 0 || utf16 > text.length) return null;
  return { snapshot_id: span.dataset.snapshot, byte: Number(span.dataset.start) + new TextEncoder().encode(text.slice(0, utf16)).length };
}
