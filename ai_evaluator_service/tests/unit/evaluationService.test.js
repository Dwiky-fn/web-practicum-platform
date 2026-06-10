const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeExperimentResult,
  deduplicateCodeFeedbacks,
} = require('../../src/services/evaluationService');

const payload = {
  requestId: 'request-1',
  submissionId: 'submission-1',
  experiment: {
    id: 'experiment-1',
    files: [
      {
        id: 'file-1',
        path: 'main.py',
        content: 'a = 1\nprint(a)',
      },
    ],
  },
};

test('feedback dengan nomor baris tidak valid dibuang', () => {
  const result = {
    codeFeedbacks: [
      {
        fileId: 'file-1',
        filePath: 'main.py',
        startLine: 10,
        endLine: 10,
        selectedCode: '',
        category: 'logic',
        severity: 'medium',
        message: 'Tidak valid',
        suggestion: '',
      },
    ],
  };

  const sanitized = sanitizeExperimentResult(result, payload);
  assert.deepEqual(sanitized.codeFeedbacks, []);
});

test('feedback duplikat dihapus', () => {
  const feedback = {
    fileId: 'file-1',
    filePath: 'main.py',
    startLine: 1,
    endLine: 1,
    selectedCode: 'a = 1',
    category: 'logic',
    severity: 'low',
    message: 'Pesan',
    suggestion: 'Saran',
  };

  assert.equal(deduplicateCodeFeedbacks([feedback, feedback]).length, 1);
});
