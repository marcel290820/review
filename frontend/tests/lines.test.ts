import assert from 'node:assert/strict';
import test from 'node:test';
import { lineRange, lineSpan, sourceLines, utf8Slice } from '../src/lines.ts';

const text = 'é🦀\r\nx\n';

test('lines use UTF-8 byte offsets, keep CR, and never invent a final line', () => {
  assert.deepEqual(sourceLines(text), [
    { number: 1, start: 0, end: 8, text: 'é🦀\r' },
    { number: 2, start: 8, end: 10, text: 'x' },
  ]);
  assert.deepEqual(sourceLines(''), [{ number: 1, start: 0, end: 0, text: '' }]);
});

test('line ranges cover whole lines and reject missing ones', () => {
  assert.deepEqual(lineRange(sourceLines(text), 1, 2), { start_byte: 0, end_byte: 10 });
  assert.throws(() => lineRange(sourceLines('a'), 1, 2));
  assert.throws(() => lineRange(sourceLines('a\nb'), 2, 1));
  assert.throws(() => lineRange(sourceLines('a'), 0, 1));
});

test('byte ranges map back to their lines and text', () => {
  const lines = sourceLines(text);
  assert.deepEqual(lineSpan(lines, 2, 6), [1, 1]);
  assert.deepEqual(lineSpan(lines, 0, 8), [1, 1]);
  assert.deepEqual(lineSpan(lines, 2, 9), [1, 2]);
  assert.equal(utf8Slice(text, 2, 6), '🦀');
});
