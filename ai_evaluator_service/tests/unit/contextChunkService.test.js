const test = require('node:test');
const assert = require('node:assert/strict');

const {
  splitLinesByCharacterBudget,
  createExperimentChunks,
} = require('../../src/services/contextChunkService');

test('splitLinesByCharacterBudget tidak memotong baris', () => {
  const groups = splitLinesByCharacterBudget(['abc', 'def', 'ghi'], 8);
  assert.deepEqual(groups, [['abc', 'def'], ['ghi']]);
});

test('chunk menyimpan offset nomor baris', () => {
  const oldContext = process.env.AI_CONTEXT_LENGTH;
  process.env.AI_CONTEXT_LENGTH = '512';

  const payload = {
    scope: 'experiment',
    submissionId: 'submission-1',
    jobsheet: { id: 'j1', title: 'Jobsheet' },
    experiment: {
      id: 'e1',
      title: 'Eksperimen',
      instruction: 'x'.repeat(2000),
      language: 'python',
      files: [
        {
          id: 'f1',
          path: 'main.py',
          content: Array.from({ length: 1000 }, (_, i) => `print(${i})`).join('\n'),
        },
      ],
    },
    rubric: { criteria: [] },
    options: { language: 'id-ID', includeScoreRecommendation: false },
  };

  const chunks = createExperimentChunks(payload);
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0].experiment.files[0]._lineOffset, 0);
  assert.ok(chunks[1].experiment.files[0]._lineOffset > 0);

  process.env.AI_CONTEXT_LENGTH = oldContext;
});
