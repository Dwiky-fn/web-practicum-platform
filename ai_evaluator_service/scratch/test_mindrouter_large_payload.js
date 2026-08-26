require('dotenv').config();
const OpenAI = require('openai');
const buildExperimentPrompt = require('../src/prompts/experimentPrompt');

async function testLargePayload() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const samplePayload = {
    submissionId: 'sub-test-123',
    jobsheet: { id: 'js-1', title: 'Percabangan', description: 'Latihan percabangan' },
    experiment: {
      id: 'exp-1',
      step: 1,
      title: 'Percobaan 1',
      objective: 'Memahami if.',
      instruction: 'Buatlah program if sederhana.',
      language: 'python',
      files: [{ id: 'f1', path: 'main.py', language: 'python', content: 'x = 10\nif x > 0:\n    print("Positif")' }],
      execution: { status: 'success', stdout: 'Positif\n', stderr: '', testCases: [] },
      studentAnalysis: 'Program berhasil mencetak Positif.',
      rubric: { criteria: [{ id: 'c1', name: 'Kebenaran', maxScore: 100 }] }
    },
    rubric: { criteria: [{ id: 'c1', name: 'Kebenaran', maxScore: 100 }] },
    options: {}
  };

  const prompt = buildExperimentPrompt(samplePayload);

  console.log('=== TEST LARGE EVALUATOR PAYLOAD WITHOUT response_format ===');
  const tStart = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ],
      temperature: 0.1,
    });
    console.log(`Status: 200 OK (${((Date.now() - tStart)/1000).toFixed(2)}s)`);
    console.log('Response content sample:', res.choices[0]?.message?.content?.slice(0, 200));
  } catch (err) {
    console.log(`FAILED (${((Date.now() - tStart)/1000).toFixed(2)}s):`, err.status, err.message);
  }
}

testLargePayload();
