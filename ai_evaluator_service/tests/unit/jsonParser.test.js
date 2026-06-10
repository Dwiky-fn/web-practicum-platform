const test = require('node:test');
const assert = require('node:assert/strict');

const {
  removeMarkdownCodeFence,
  parseJsonResponse,
} = require('../../src/utils/jsonParser');

test('removeMarkdownCodeFence menghapus fence JSON', () => {
  const result = removeMarkdownCodeFence('```json\n{"ok":true}\n```');
  assert.equal(result, '{"ok":true}');
});

test('parseJsonResponse mem-parse JSON valid', () => {
  assert.deepEqual(parseJsonResponse('{"ok":true}'), { ok: true });
});

test('parseJsonResponse menolak JSON rusak', () => {
  assert.throws(() => parseJsonResponse('{"ok":'), SyntaxError);
});
