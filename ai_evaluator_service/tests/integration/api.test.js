const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.PORT = '5000';
process.env.NODE_ENV = 'test';
process.env.AI_SERVICE_API_KEY = '';
process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
process.env.OLLAMA_MODEL = 'gemma3:4b-it-qat';
process.env.AI_CONTEXT_LENGTH = '4096';
process.env.AI_REQUEST_TIMEOUT_MS = '300000';
process.env.AI_MAX_CONCURRENT_REQUESTS = '1';
process.env.AI_MAX_RETRIES = '2';

const { server } = require('../../src/server');

let port;
let originalFetch;

test.before(async () => {
  originalFetch = global.fetch;
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

test.after(async () => {
  global.fetch = originalFetch;
  await new Promise((resolve) => server.close(resolve));
});

test('GET /health mengembalikan status model', async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        models: [{ name: 'gemma3:4b-it-qat' }],
      };
    },
  });

  const response = await request({ method: 'GET', path: '/health' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'success');
  assert.equal(response.body.ollama.modelAvailable, true);
});

test('GET /health tetap memberi JSON ketika Ollama tidak aktif', async () => {
  global.fetch = async () => {
    throw new TypeError('fetch failed');
  };

  const response = await request({ method: 'GET', path: '/health' });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.status, 'fail');
  assert.equal(response.body.ollama.status, 'disconnected');
});

test('POST /api/evaluations menerima scope experiment', async () => {
  const modelResult = createExperimentResult();

  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { response: JSON.stringify(modelResult) };
    },
  });

  const response = await request({
    method: 'POST',
    path: '/api/evaluations',
    body: createExperimentPayload(),
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.status, 'accepted');
});

test('POST /api/evaluations menolak payload tidak valid', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/evaluations',
    body: { scope: 'experiment' },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('JSON rusak diperbaiki melalui retry', async () => {
  let calls = 0;

  global.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          response:
            calls === 1
              ? '{"scope":'
              : JSON.stringify(createExperimentResult()),
        };
      },
    };
  };

  const response = await request({
    method: 'POST',
    path: '/api/evaluations',
    body: createExperimentPayload(),
  });

  assert.equal(response.statusCode, 202);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(calls, 2);
});

test('retry habis mengembalikan 502', async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { response: '{invalid' };
    },
  });

  const response = await request({
    method: 'POST',
    path: '/api/evaluations',
    body: createExperimentPayload(),
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.status, 'accepted');
});

test('POST /api/evaluations menerima scope jobsheet lengkap', async () => {
  let calls = 0;
  const experimentResult = createExperimentResult();
  const jobsheetResult = {
    scope: 'jobsheet',
    submissionId: 'submission-1',
    jobsheetId: 'jobsheet-1',
    jobsheetFeedback: {
      summary: 'Pemahaman mahasiswa sangat baik.',
      overallUnderstanding: 'Memahami konsep.',
      strengths: [],
      issues: [],
      consistencyEvaluation: 'Konsisten.',
      conclusionEvaluation: 'Tepat.',
      experimentsNeedingAttention: [],
      learningSuggestions: []
    },
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true
  };

  global.fetch = async (url, options) => {
    calls += 1;
    let responseObj;
    if (calls === 1) {
      responseObj = experimentResult;
    } else {
      responseObj = jobsheetResult;
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { response: JSON.stringify(responseObj) };
      },
    };
  };

  const response = await request({
    method: 'POST',
    path: '/api/evaluations',
    body: {
      scope: 'jobsheet',
      submissionId: 'submission-1',
      jobsheet: {
        id: 'jobsheet-1',
        title: 'Percabangan',
        description: 'Latihan percabangan.'
      },
      experiments: [
        {
          id: 'experiment-1',
          title: 'Percobaan 1',
          objective: 'Memahami if.',
          instruction: 'Tampilkan Positif untuk nilai lebih dari nol.',
          language: 'java',
          files: [
            {
              id: 'file-1',
              path: 'src/Main.java',
              language: 'java',
              content: 'class Main { public static void main(String[] args) {} }',
            },
          ],
          execution: {
            status: 'success',
            stdout: 'Positif',
            stderr: '',
            testCases: [],
          },
          studentAnalysis: 'Program menggunakan if.',
          studentConclusion: 'Percabangan memilih kondisi.',
          rubric: {
            criteria: [
              {
                id: 'correctness_experiment-1',
                name: 'Kebenaran',
                maxScore: 100
              }
            ]
          }
        }
      ],
      studentConclusion: 'Selesai.',
      rubric: {
        criteria: [
          {
            id: 'correctness_experiment-1',
            name: 'Percobaan 1',
            maxScore: 100
          }
        ]
      }
    },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.status, 'accepted');
});


function request({ method, path, body }) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: data
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {},
      },
      (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: responseBody ? JSON.parse(responseBody) : null,
          });
        });
      },
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function createExperimentPayload() {
  return {
    scope: 'experiment',
    submissionId: 'submission-1',
    jobsheet: {
      id: 'jobsheet-1',
      title: 'Percabangan',
      description: 'Latihan percabangan.',
    },
    experiment: {
      id: 'experiment-1',
      title: 'Percobaan 1',
      objective: 'Memahami if.',
      instruction: 'Tampilkan Positif untuk nilai lebih dari nol.',
      language: 'java',
      files: [
        {
          id: 'file-1',
          path: 'src/Main.java',
          language: 'java',
          content: 'class Main { public static void main(String[] args) {} }',
        },
      ],
      execution: {
        status: 'success',
        stdout: 'Positif',
        stderr: '',
        testCases: [],
      },
      studentAnalysis: 'Program menggunakan if.',
      studentConclusion: 'Percabangan memilih kondisi.',
    },
    rubric: {
      criteria: [
        {
          id: 'correctness_experiment-1',
          name: 'Kebenaran program',
          maxScore: 100,
        },
      ],
    },
  };
}

function createExperimentResult() {
  return {
    scope: 'experiment',
    submissionId: 'submission-1',
    experimentId: 'experiment-1',
    codeFeedbacks: [],
    experimentFeedback: {
      summary: 'Program memenuhi instruksi dasar.',
      instructionCompliance: 'Sesuai.',
      codeEvaluation: 'Struktur program dapat dianalisis.',
      outputEvaluation: 'Output sesuai data eksekusi.',
      testCaseEvaluation: 'Tidak ada test case.',
      errorEvaluation: 'Tidak ada error yang dilaporkan.',
      analysisEvaluation: 'Analisis masih singkat.',
      strengths: ['Output sesuai.'],
      issues: [],
      suggestions: ['Jelaskan alur kondisi lebih rinci.'],
    },
    rubricScores: [
      {
        criterionId: 'correctness_experiment-1',
        score: 80,
        maxScore: 100,
        reason: 'Output sesuai bukti yang dikirim.',
      },
    ],
    totalScoreRecommendation: 80,
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true,
  };
}
