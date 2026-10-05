import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLines, lineRange } from '../src/selection.js';
test('source lines use UTF-8 byte offsets, preserve CRLF and do not invent a final line', () => {
  assert.deepEqual(sourceLines('é🦀\r\nx\n'), [{start:0,end:8,text:'é🦀\r',number:1},{start:8,end:10,text:'x',number:2}]);
  assert.deepEqual(lineRange('é🦀\r\nx\n',1,2),{start_byte:0,end_byte:10});
  assert.deepEqual(sourceLines(''),[{start:0,end:0,text:'',number:1}]);
  assert.throws(() => lineRange('a',1,2));
  assert.throws(() => lineRange('a\nb',2,1));
});
