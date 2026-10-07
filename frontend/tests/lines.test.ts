import assert from 'node:assert/strict';
import test from 'node:test';
import { Responses } from '../src/api.ts';
import { byteIndex, lineRange, lineSpan, segments, sourceLines, utf8Length, utf8Slice } from '../src/lines.ts';

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

test('UTF-8 lengths and byte offsets match the encoder', () => {
  for (const sample of ['', 'ascii', 'é🦀\r', '界👨‍👩‍👧x']) {
    assert.equal(utf8Length(sample), new TextEncoder().encode(sample).length);
  }
  const at = byteIndex('é🦀x');
  assert.deepEqual([0, 2, 6, 7].map(at), [0, 1, 3, 4]);
});

test('segments cut at marks and changes without splitting characters', () => {
  // `**b**` bold with quiet delimiters, as the server marks it.
  assert.deepEqual(segments('a **b**', [2, 4, 130, 4, 5, 2, 5, 7, 130]), [
    { text: 'a ', flags: 0, changed: false },
    { text: '**', flags: 130, changed: false },
    { text: 'b', flags: 2, changed: false },
    { text: '**', flags: 130, changed: false },
  ]);
  // A changed accent marks the letter it sits on.
  assert.deepEqual(segments('café', [], [{ start: 4, end: 6 }]), [
    { text: 'caf', flags: 0, changed: false },
    { text: 'é', flags: 0, changed: true },
  ]);
  assert.deepEqual(segments('plain'), [{ text: 'plain', flags: 0, changed: false }]);
});

test('cuts never split a character, even inside an emoji sequence', () => {
  const family = '👨‍👩‍👧';
  // A change starting at the second person, as a word diff of separate code points could.
  const second = utf8Length('👨‍');
  const pieces = segments(`${family}x`, [], [{ start: second, end: second + 4 }]);
  assert.deepEqual(pieces, [
    { text: family, flags: 0, changed: true },
    { text: 'x', flags: 0, changed: false },
  ]);
  // A change ending inside a character takes all of it.
  assert.deepEqual(segments('aéb', [], [{ start: 1, end: 2 }]).map((s) => [s.text, s.changed]), [
    ['a', false],
    ['é', true],
    ['b', false],
  ]);
});

test('review states apply in request order and only when new', () => {
  const responses = new Responses();
  const state = (n: number) => JSON.stringify({ comments: [], disk: [], dirty: n > 0, output: 'out', last_saved: null });
  const [older, newer] = [responses.next(), responses.next()];
  // An overtaken response is dropped without hiding the same state from the newer one.
  assert.equal(responses.accept(older, state(1)), null);
  assert.equal(responses.accept(newer, state(1))?.dirty, true);
  assert.equal(responses.accept(responses.next(), state(1)), null);
  assert.equal(responses.accept(responses.next(), state(0))?.dirty, false);
});

test('long lines with many marks segment in linear time', () => {
  for (const unit of ['ab', 'éb']) {
    // 10,000 bold runs, each `**x**` around one unit, as a 60 KB line could have.
    const text = `**${unit}** `.repeat(10_000);
    const width = utf8Length(`**${unit}** `);
    const marks: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const at = i * width;
      marks.push(at, at + 2, 130, at + 2, at + width - 3, 2, at + width - 3, at + width - 1, 130);
    }
    const started = performance.now();
    const pieces = segments(text, marks, [{ start: 0, end: width }]);
    assert.ok(performance.now() - started < 400, `${unit}: ${performance.now() - started} ms`);
    assert.equal(pieces.length, 40_000);
    assert.deepEqual(pieces.slice(0, 3).map((p) => [p.text, p.flags, p.changed]), [
      ['**', 130, true],
      [unit, 2, true],
      ['**', 130, true],
    ]);
  }
});
