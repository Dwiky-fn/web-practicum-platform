const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeExperimentResult,
  deduplicateCodeFeedbacks,
  parseAndValidate,
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

test('parseAndValidate menghitung ulang dan mengoverride totalScoreRecommendation dari model', () => {
  const customPayload = {
    scope: 'experiment',
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
    rubric: {
      criteria: [
        {
          id: 'correctness',
          maxScore: 100,
        },
      ],
    },
  };

  const modelOutput = JSON.stringify({
    scope: 'experiment',
    submissionId: 'submission-1',
    experimentId: 'experiment-1',
    codeFeedbacks: [],
    experimentFeedback: {
      summary: 'Baik',
      instructionCompliance: 'Sesuai',
      codeEvaluation: 'Baik',
      outputEvaluation: 'Sesuai',
      testCaseEvaluation: 'Lulus',
      errorEvaluation: '',
      analysisEvaluation: 'Cukup',
      strengths: [],
      issues: [],
      suggestions: [],
    },
    rubricScores: [
      {
        criterionId: 'correctness',
        score: 80,
        maxScore: 100,
        reason: 'Program berjalan.',
      },
    ],
    totalScoreRecommendation: 20, // Model sends incorrect total score
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true,
  });

  const { valid, value } = parseAndValidate(modelOutput, customPayload);
  assert.equal(valid, true);
  assert.equal(value.totalScoreRecommendation, 80); // Should be recalculated to 80 (sum of rubricScores)
});

