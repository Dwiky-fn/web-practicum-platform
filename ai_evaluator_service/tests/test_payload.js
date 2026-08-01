/**
 * Script untuk menguji validasi payload secara lokal 
 * tanpa perlu menjalankan server.
 * 
 * Simulasi: payload yang dikirim oleh AiEvaluationQueue.js di Railway
 */
const { validateEvaluationRequest } = require('../src/schemas/evaluationRequestSchema');

// Simulasi payload persis dari AiEvaluationQueue.js
const payload = {
  schemaVersion: '1.0',
  scope: 'jobsheet',
  submission: {
    id: 'sub-a1ef92dc-df8',
    source: 'manual',
    attemptType: 'normal',
    attemptNo: 1,
    remedialId: null,
    isAutoSubmitted: false,
  },
  context: {
    kelasPraktikumId: 'kp-12345',
    idKelasMhs: 'km-67890',
    studentId: 'std-001',
    classId: 'cls-101',
    programmingLanguage: 'java',
    courseName: 'Pemrograman Web & Mobile',
  },
  jobsheet: {
    id: 'job-001',
    title: 'Jobsheet 1: Pengenalan Java',
    description: 'Praktikum dasar Java',
  },
  experiments: [
    {
      id: 'exp-001:1',
      experimentId: 'exp-001',
      step: 1,
      title: 'Percobaan 1 - Langkah 1',
      objective: '',
      instruction: 'Buat program percabangan.',
      language: 'java',
      files: [
        {
          id: 'Main.java',
          path: 'Main.java',
          language: 'java',
          content: 'class Main { public static void main(String[] args) { System.out.println("Hello"); } }',
        },
      ],
      templateFiles: [
        {
          id: 'Main.java',
          path: 'Main.java',
          language: 'java',
          content: '// Template',
        },
      ],
      hasStudentCode: true,
      execution: {
        status: 'success',
        stdin: '',
        stdout: 'Hello\n',
        stderr: '',
        expectedOutput: '',
        exitCode: 0,
        durationMs: 45,
        testCases: [],
      },
      studentAnalysis: 'Program berjalan.',
      studentConclusion: '',
      rubric: {
        criteria: [
          {
            id: 'correctness_exp-001_step-1',
            name: 'Kebenaran Langkah 1',
            description: 'Kesesuaian langkah 1 dengan instruksi.',
            maxScore: 100,
          },
        ],
      },
    },
  ],
  exercises: [],
  studentConclusion: 'Praktikum berjalan lancar.',
  rubric: {
    criteria: [
      {
        id: 'correctness_exp-001_step-1',
        name: 'Percobaan 1 - Langkah 1',
        description: 'Kesesuaian langkah 1.',
        maxScore: 100,
      },
    ],
  },
  options: {
    language: 'id-ID',
    includeScoreRecommendation: true,
    webhookUrl: 'https://api-praktikum.polnep.ac.id/api/internal/ai-callback',
  },
};

console.log('=== Test 1: Payload jobsheet lengkap ===');
const result1 = validateEvaluationRequest(payload);
if (result1.error) {
  console.error('❌ GAGAL:', result1.error.message);
  for (const d of result1.error.details) {
    console.error('  -', d.message, '| path:', d.path.join('.'), '| type:', d.type);
    if (d.context?.details) {
      for (const alt of d.context.details) {
        console.error('    Alternative:', alt.message);
        if (alt.details) {
          for (const dd of alt.details) {
            console.error('      -', dd.message, '| path:', dd.path?.join('.'));
          }
        }
      }
    }
  }
} else {
  console.log('✅ VALID! submissionId:', result1.value.submissionId);
}

// Test tanpa context (payload lama non-canonical)
console.log('\n=== Test 2: Payload tanpa context & submission (minimal) ===');
const result2 = validateEvaluationRequest({
  scope: 'experiment',
  submissionId: 'submission-1',
  jobsheet: { id: 'j-1', title: 'JS' },
  experiment: {
    id: 'exp-1',
    title: 'Percobaan 1',
    instruction: 'Buat program.',
    language: 'java',
    files: [{ id: 'f-1', path: 'Main.java', language: 'java', content: 'class Main {}' }],
  },
  rubric: { criteria: [{ id: 'c-1', name: 'Kebenaran', maxScore: 100 }] },
});
if (result2.error) {
  console.error('❌ GAGAL:', result2.error.message);
  for (const d of result2.error.details) {
    console.error('  -', d.message, '| path:', d.path.join('.'), '| type:', d.type);
  }
} else {
  console.log('✅ VALID! submissionId:', result2.value.submissionId);
}

// Test payload dengan exercises kosong, dan null values
console.log('\n=== Test 3: Payload dengan exercises kosong & null fields ===');
const result3 = validateEvaluationRequest({
  ...payload,
  exercises: [],
  studentConclusion: null,
  submission: {
    ...payload.submission,
    remedialId: null,
  },
});
if (result3.error) {
  console.error('❌ GAGAL:', result3.error.message);
  for (const d of result3.error.details) {
    console.error('  -', d.message, '| path:', d.path.join('.'), '| type:', d.type);
  }
} else {
  console.log('✅ VALID! submissionId:', result3.value.submissionId);
}

// Test payload exercise scope
console.log('\n=== Test 4: Payload exercise scope ===');
const result4 = validateEvaluationRequest({
  scope: 'exercise',
  submissionId: 'sub-abc',
  jobsheet: { id: 'j-1', title: 'JS' },
  exercise: {
    id: 'exe-1',
    title: 'Latihan 1',
    instruction: 'Buat latihan.',
    language: 'python',
    files: [{ id: 'f-1', path: 'main.py', language: 'python', content: 'print("Hello")' }],
  },
  rubric: { criteria: [{ id: 'c-1', name: 'Kebenaran', maxScore: 100 }] },
});
if (result4.error) {
  console.error('❌ GAGAL:', result4.error.message);
  for (const d of result4.error.details) {
    console.error('  -', d.message, '| path:', d.path.join('.'), '| type:', d.type);
  }
} else {
  console.log('✅ VALID! submissionId:', result4.value.submissionId);
}

console.log('\n=== Selesai ===');
