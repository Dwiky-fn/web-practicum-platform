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

function createCanonicalJobsheetPayload(overrides = {}) {
  return {
    schemaVersion: '1.0',
    scope: 'jobsheet',
    submission: {
      id: 'submission-1',
      source: 'manual',
      attemptType: 'normal',
      attemptNo: 1,
      remedialId: null,
      isAutoSubmitted: false,
    },
    context: {
      kelasPraktikumId: 'kp-1',
      idKelasMhs: 'km-1',
      studentId: 'student-1',
      classId: 'kp-1',
      programmingLanguage: 'java',
      courseName: 'Pemrograman Berorientasi Objek',
    },
    jobsheet: {
      id: 'jobsheet-1',
      title: 'Tipe Data',
      description: '',
    },
    experiments: [
      {
        id: 'experiment-1:1',
        experimentId: 'experiment-1',
        step: 1,
        title: 'Percobaan 1 - Langkah 1',
        objective: '',
        instruction: 'Buat program sederhana.',
        language: 'java',
        files: [
          {
            id: 'Main.java',
            path: 'Main.java',
            language: 'java',
            content: 'class Main {}',
          },
        ],
        templateFiles: [
          {
            id: 'Main.java',
            path: 'Main.java',
            language: 'java',
            content: 'class Main { }',
          },
        ],
        hasStudentCode: true,
        execution: {
          status: 'success',
          stdin: '',
          stdout: 'OK',
          stderr: '',
          expectedOutput: '',
          exitCode: 0,
          durationMs: 10,
          testCases: [],
        },
        studentAnalysis: 'Program berjalan.',
        studentConclusion: '',
        rubric: {
          criteria: [
            {
              id: 'correctness_experiment-1_step-1',
              name: 'Kebenaran Langkah 1',
              maxScore: 100,
            },
          ],
        },
      },
    ],
    exercises: [],
    studentConclusion: '',
    rubric: {
      criteria: [
        {
          id: 'correctness_experiment-1_step-1',
          name: 'Percobaan 1 - Langkah 1',
          maxScore: 100,
        },
      ],
    },
    options: {
      language: 'id-ID',
      includeScoreRecommendation: true,
    },
    ...overrides,
  };
}

test('canonical jobsheet manual dengan kode diterima dan dinormalisasi', () => {
  const { error, value } = validateEvaluationRequest(createCanonicalJobsheetPayload());

  assert.equal(error, undefined);
  assert.equal(value.submissionId, 'submission-1');
  assert.equal(value.submission.source, 'manual');
});

test('canonical auto-submit kosong diterima tanpa kode mahasiswa', () => {
  const payload = createCanonicalJobsheetPayload({
    submission: {
      id: 'submission-auto-1',
      source: 'auto_deadline',
      attemptType: 'normal',
      attemptNo: 1,
      remedialId: null,
      isAutoSubmitted: true,
    },
  });
  payload.experiments[0].files = [];
  payload.experiments[0].hasStudentCode = false;
  payload.experiments[0].execution = {
    status: 'not_run',
    stdin: '',
    stdout: '',
    stderr: '',
    expectedOutput: '',
    exitCode: null,
    durationMs: null,
    testCases: [],
  };
  payload.experiments[0].studentAnalysis = '';

  const { error, value } = validateEvaluationRequest(payload);

  assert.equal(error, undefined);
  assert.equal(value.submissionId, 'submission-auto-1');
  assert.equal(value.experiments[0].files.length, 0);
  assert.equal(value.experiments[0].templateFiles.length, 1);
});

test('canonical auto-submit dengan sebagian progress diterima', () => {
  const payload = createCanonicalJobsheetPayload({
    submission: {
      id: 'submission-auto-partial-1',
      source: 'auto_deadline',
      attemptType: 'normal',
      attemptNo: 1,
      remedialId: null,
      isAutoSubmitted: true,
    },
  });
  payload.experiments[0].execution.status = 'not_run';
  payload.experiments[0].execution.stdout = '';
  payload.experiments[0].execution.exitCode = null;
  payload.experiments[0].execution.durationMs = null;

  const { error } = validateEvaluationRequest(payload);

  assert.equal(error, undefined);
});

test('canonical remedial wajib terpisah dengan remedialId', () => {
  const payload = createCanonicalJobsheetPayload({
    submission: {
      id: 'submission-remedial-1',
      source: 'remedial',
      attemptType: 'remedial',
      attemptNo: 2,
      remedialId: 'rem-1',
      isAutoSubmitted: false,
    },
  });

  const { error, value } = validateEvaluationRequest(payload);

  assert.equal(error, undefined);
  assert.equal(value.submission.remedialId, 'rem-1');
});

test('canonical remedial tanpa remedialId ditolak', () => {
  const payload = createCanonicalJobsheetPayload({
    submission: {
      id: 'submission-remedial-2',
      source: 'remedial',
      attemptType: 'remedial',
      attemptNo: 2,
      remedialId: null,
      isAutoSubmitted: false,
    },
  });

  const { error } = validateEvaluationRequest(payload);

  assert.ok(error);
});

test('canonical jobsheet latihan tanpa percobaan diterima', () => {
  const payload = createCanonicalJobsheetPayload();
  payload.experiments = [];
  payload.exercises = [
    {
      id: 'exercise-1',
      title: 'Latihan 1',
      objective: '',
      instruction: 'Buat latihan sederhana.',
      language: 'java',
      files: [],
      templateFiles: [],
      hasStudentCode: false,
      execution: {
        status: 'not_available',
        stdin: '',
        stdout: '',
        stderr: '',
        expectedOutput: '',
        exitCode: null,
        durationMs: null,
        testCases: [],
      },
      studentAnalysis: '',
      studentConclusion: '',
      rubric: {
        criteria: [
          {
            id: 'correctness_exercise-1',
            name: 'Kebenaran Latihan 1',
            maxScore: 100,
          },
        ],
      },
    },
  ];
  payload.rubric.criteria = [
    {
      id: 'correctness_exercise-1',
      name: 'Latihan 1',
      maxScore: 100,
    },
  ];

  const { error, value } = validateEvaluationRequest(payload);

  assert.equal(error, undefined);
  assert.equal(value.experiments.length, 0);
  assert.equal(value.exercises.length, 1);
});

test('canonical jobsheet tanpa percobaan dan latihan ditolak', () => {
  const payload = createCanonicalJobsheetPayload({
    experiments: [],
    exercises: [],
  });

  const { error } = validateEvaluationRequest(payload);

  assert.ok(error);
});
