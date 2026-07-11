const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateFinalReviewScore,
} = require('../src/services/review/SubmissionReviewScoringService');

const jobsheetParts = {
  experiments: [
    { id: 'exp-1', title: 'Percobaan 1', rubric: 20 },
    { id: 'exp-2', title: 'Percobaan 2', rubric: 20 },
  ],
  exercises: [
    { id: 'exe-1', title: 'Latihan 1', rubric: 30 },
  ],
};

const scoreBreakdown = {
  items: [
    {
      type: 'theory',
      itemId: 'theory',
      title: 'Dasar Teori',
      earnedScore: 15,
      weight: 30,
    },
  ],
};

test('nilai bagian tidak boleh negatif atau melebihi bobot', () => {
  assert.throws(
    () => calculateFinalReviewScore({
      jobsheetParts,
      scoreBreakdown,
      sectionEvaluations: [
        { type: 'experiment', sectionId: 'exp-1', score: 21 },
      ],
    }),
    /rentang 0-20/,
  );

  assert.throws(
    () => calculateFinalReviewScore({
      jobsheetParts,
      scoreBreakdown,
      sectionEvaluations: [
        { type: 'exercise', sectionId: 'exe-1', score: -1 },
      ],
    }),
    /rentang 0-30/,
  );
});

test('nilai akhir dihitung dari dasar teori otomatis dan nilai setiap bagian', () => {
  const result = calculateFinalReviewScore({
    jobsheetParts,
    scoreBreakdown,
    sectionEvaluations: [
      { type: 'experiment', sectionId: 'exp-1', score: 18, feedback: 'Baik' },
      { type: 'experiment', sectionId: 'exp-2', score: 16, feedback: 'Cukup' },
      { type: 'exercise', sectionId: 'exe-1', score: 25, feedback: 'Perlu rapi' },
    ],
  });

  assert.equal(result.theoryScore, 15);
  assert.equal(result.sectionScore, 59);
  assert.equal(result.finalScore, 74);
  assert.equal(result.totalWeight, 100);
  assert.equal(result.isComplete, true);
});

test('nilai akhir tidak menjadi 100 jika masih ada bagian wajib belum dinilai', () => {
  const result = calculateFinalReviewScore({
    jobsheetParts,
    scoreBreakdown,
    sectionEvaluations: [
      { type: 'experiment', sectionId: 'exp-1', score: 20 },
      { type: 'exercise', sectionId: 'exe-1', score: 30 },
    ],
  });

  assert.equal(result.finalScore, 65);
  assert.equal(result.isComplete, false);
  assert.deepEqual(result.missingRequired.map((item) => item.sectionId), ['exp-2']);
});

test('bagian yang tidak ada pada jobsheet ditolak', () => {
  assert.throws(
    () => calculateFinalReviewScore({
      jobsheetParts,
      scoreBreakdown,
      sectionEvaluations: [
        { type: 'experiment', sectionId: 'exp-x', score: 10 },
      ],
    }),
    /tidak ditemukan/,
  );
});
