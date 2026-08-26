const test = require('node:test');
const assert = require('node:assert/strict');
const mindrouterService = require('../../src/services/mindrouterService');
const ollamaService = require('../../src/services/ollamaService');

test('getMindRouterConfig mengembalikan konfigurasi default', () => {
  const config = mindrouterService.getMindRouterConfig();
  assert.equal(config.baseURL, 'https://api.mindrouter.io/v1');
  assert.equal(config.model, 'openai/gpt-5.6-luna');
});

test('checkMindRouterHealth mengembalikan disconnected jika API key tidak diset', async () => {
  const originalKey = process.env.MINDROUTER_API_KEY;
  delete process.env.MINDROUTER_API_KEY;

  const health = await mindrouterService.checkMindRouterHealth();
  assert.equal(health.connected, false);
  assert.equal(health.model, 'openai/gpt-5.6-luna');
  assert.match(health.message, /belum dikonfigurasi/);

  if (originalKey) process.env.MINDROUTER_API_KEY = originalKey;
});

test('isRetryableError mengidentifikasi HTTP 429, 502, 503, 504 dan timeout', () => {
  const { isRetryableError } = mindrouterService;
  assert.equal(isRetryableError({ status: 429 }), true);
  assert.equal(isRetryableError({ status: 502 }), true);
  assert.equal(isRetryableError({ status: 503 }), true);
  assert.equal(isRetryableError({ status: 504 }), true);
  assert.equal(isRetryableError({ code: 'ETIMEDOUT' }), true);
  assert.equal(isRetryableError({ message: '502 Bad Gateway' }), true);
  assert.equal(isRetryableError({ status: 400 }), false);
  assert.equal(isRetryableError({ status: 401 }), false);
});

test('calculateBackoffDelay menghitung exponential delay dan menghormati retry-after', () => {
  const { calculateBackoffDelay } = mindrouterService;

  const delayAttempt1 = calculateBackoffDelay(1, { status: 502 });
  assert.ok(delayAttempt1 >= 2000 && delayAttempt1 <= 3000);

  const delayAttempt2 = calculateBackoffDelay(2, { status: 502 });
  assert.ok(delayAttempt2 >= 4000 && delayAttempt2 <= 5000);

  const delayRetryAfter = calculateBackoffDelay(1, { headers: { 'retry-after': '60' }, status: 502 });
  assert.ok(delayRetryAfter >= 60000);
});

test('generateJsonText melakukan fallback ke Ollama saat MindRouter gagal', async () => {
  const originalKey = process.env.MINDROUTER_API_KEY;
  process.env.MINDROUTER_API_KEY = 'dummy-invalid-key';

  const originalOllamaGenerate = ollamaService.generateJsonText;
  let ollamaCalled = false;
  ollamaService.generateJsonText = async (params) => {
    ollamaCalled = true;
    return JSON.stringify({ scope: 'experiment', status: 'draft' });
  };

  try {
    const result = await mindrouterService.generateJsonText({
      systemPrompt: 'System prompt',
      userPrompt: 'User prompt',
      requestId: 'test-req-123',
    });

    assert.equal(ollamaCalled, true);
    assert.match(result, /draft/);
  } finally {
    ollamaService.generateJsonText = originalOllamaGenerate;
    if (originalKey) process.env.MINDROUTER_API_KEY = originalKey;
    else delete process.env.MINDROUTER_API_KEY;
  }
});
