const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateEvaluationRequest,
} = require('../../src/schemas/evaluationRequestSchema');

function createPayload() {
  return {
    scope: 'experiment',
    submissionId: 'submission-1',
    jobsheet: {
      id: 'jobsheet-1',
      title: 'Percabangan',
    },
    experiment: {
      id: 'experiment-1',
      title: 'Percobaan 1',
      instruction: 'Buat program percabangan.',
      language: 'java',
      files: [
        {
          id: 'file-1',
          path: 'src/Main.java',
          language: 'java',
          content: 'class Main {}',
        },
      ],
    },
    rubric: {
      criteria: [
        {
          id: 'correctness',
          name: 'Kebenaran',
          maxScore: 100,
        },
      ],
    },
  };
}

test('request experiment valid diterima', () => {
  const { error, value } = validateEvaluationRequest(createPayload());
  assert.equal(error, undefined);
  assert.equal(value.options.language, 'id-ID');
});

test('file ID duplikat ditolak', () => {
  const payload = createPayload();
  payload.experiment.files.push({ ...payload.experiment.files[0] });

  const { error } = validateEvaluationRequest(payload);
  assert.ok(error);
});

test('scope selain experiment, exercise, dan jobsheet ditolak', () => {
  const payload = createPayload();
  payload.scope = 'full';

  const { error } = validateEvaluationRequest(payload);
  assert.ok(error);
});

test('request exercise valid diterima', () => {
  const payload = {
    scope: 'exercise',
    submissionId: 'submission-1',
    jobsheet: {
      id: 'jobsheet-1',
      title: 'Percabangan',
    },
    exercise: {
      id: 'exercise-1',
      title: 'Latihan 1',
      instruction: 'Buat program latihan percabangan.',
      language: 'java',
      files: [
        {
          id: 'file-1',
          path: 'src/Main.java',
          language: 'java',
          content: 'class Main {}',
        },
      ],
    },
    rubric: {
      criteria: [
        {
          id: 'correctness',
          name: 'Kebenaran',
          maxScore: 100,
        },
      ],
    },
  };

  const { error, value } = validateEvaluationRequest(payload);
  assert.equal(error, undefined);
  assert.equal(value.options.language, 'id-ID');
});
