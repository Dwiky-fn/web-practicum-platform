const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateEvaluationResult,
} = require('../../src/schemas/evaluationResultSchema');

function createResult() {
  return {
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
    totalScoreRecommendation: 80,
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true,
  };
}

test('result valid diterima', () => {
  const { error } = validateEvaluationResult(createResult());
  assert.equal(error, undefined);
});

test('total score yang tidak cocok ditolak', () => {
  const result = createResult();
  result.totalScoreRecommendation = 90;

  const { error } = validateEvaluationResult(result);
  assert.ok(error);
});

test('status published ditolak', () => {
  const result = createResult();
  result.status = 'published';

  const { error } = validateEvaluationResult(result);
  assert.ok(error);
});
