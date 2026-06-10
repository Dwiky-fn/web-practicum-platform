const test = require('node:test');
const assert = require('node:assert/strict');

require('dotenv').config();

const {
  checkOllamaHealth,
} = require('../../src/services/ollamaService');

const shouldRun = process.env.RUN_OLLAMA_TEST === 'true';

test(
  'manual: Ollama lokal dan model tersedia',
  { skip: !shouldRun },
  async () => {
    const health = await checkOllamaHealth();
    assert.equal(health.connected, true);
    assert.equal(health.modelAvailable, true);
  },
);
