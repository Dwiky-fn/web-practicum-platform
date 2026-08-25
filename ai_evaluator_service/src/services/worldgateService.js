const OpenAI = require('openai');
const AppError = require('../utils/AppError');
const ConcurrencyLimiter = require('../utils/concurrencyLimiter');
const logger = require('../utils/logger');

const maxConcurrent = readNumberEnv('AI_MAX_CONCURRENT_REQUESTS', 1);
const limiter = new ConcurrencyLimiter(maxConcurrent);

const WORLDGATE_MODEL = process.env.WORLDGATE_MODEL || 'gpt-4o-mini';
const WORLDGATE_BASE_URL = process.env.WORLDGATE_BASE_URL || 'https://api.worldgateapi.com/v1/';

function getWorldGateClient() {
  const apiKey = process.env.WORLDGATE_API_KEY;
  if (!apiKey) {
    throw new AppError('WORLDGATE_API_KEY belum dikonfigurasi di environment variable', {
      statusCode: 500,
      code: 'WORLDGATE_CONFIG_ERROR',
    });
  }

  return new OpenAI({
    apiKey,
    baseURL: WORLDGATE_BASE_URL,
  });
}

async function checkWorldGateHealth() {
  const apiKey = process.env.WORLDGATE_API_KEY;
  if (!apiKey) {
    return {
      connected: false,
      model: WORLDGATE_MODEL,
      modelAvailable: false,
      message: 'WORLDGATE_API_KEY belum dikonfigurasi',
    };
  }

  try {
    const client = getWorldGateClient();
    const response = await client.chat.completions.create({
      model: WORLDGATE_MODEL,
      messages: [{ role: 'user', content: 'Respond with OK' }],
      max_tokens: 10,
    });

    const isOk = Boolean(response.choices && response.choices.length > 0);
    return {
      connected: isOk,
      model: WORLDGATE_MODEL,
      modelAvailable: isOk,
      message: isOk ? 'WorldGate API terhubung dan model tersedia' : 'WorldGate API tidak memberikan respon valid',
    };
  } catch (error) {
    return {
      connected: false,
      model: WORLDGATE_MODEL,
      modelAvailable: false,
      message: `Pemeriksaan koneksi WorldGate gagal: ${error.message}`,
    };
  }
}

async function generateJsonText({ systemPrompt, userPrompt, requestId }) {
  return limiter.run(async () => {
    const startedAt = Date.now();
    const timeoutMs = readNumberEnv('AI_REQUEST_TIMEOUT_MS', 300000);
    const temperature = readNumberEnv('AI_TEMPERATURE', 0.1);

    logger.info('[WorldGate] Request started', {
      requestId,
      model: WORLDGATE_MODEL,
      activeRequests: limiter.getActiveCount(),
      pendingRequests: limiter.getPendingCount(),
    });

    try {
      const client = getWorldGateClient();
      const response = await client.chat.completions.create(
        {
          model: WORLDGATE_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          response_format: { type: 'json_object' },
        },
        {
          timeout: timeoutMs,
        },
      );

      const content = response.choices && response.choices[0] && response.choices[0].message
        ? response.choices[0].message.content
        : null;

      if (typeof content !== 'string' || !content.trim()) {
        logger.error('[WorldGate] Request empty response', { requestId, model: WORLDGATE_MODEL });
        throw new AppError('Response WorldGate tidak memiliki output evaluasi', {
          statusCode: 502,
          code: 'WORLDGATE_EMPTY_RESPONSE',
        });
      }

      logger.info('[WorldGate] Request completed', {
        requestId,
        model: WORLDGATE_MODEL,
        durationMs: Date.now() - startedAt,
      });

      return content;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const status = error.status || error.statusCode || 500;
      const errorMsg = error.message || 'Error tidak diketahui dari WorldGate API';

      logger.error('[WorldGate] Request failed', { requestId, status, error: errorMsg });
      throw new AppError(`WorldGate API mengalami kendala: ${errorMsg}`, {
        statusCode: status >= 500 ? 502 : status,
        code: 'WORLDGATE_API_ERROR',
        details: [{ status, message: errorMsg }],
      });
    }
  });
}

function readNumberEnv(key, fallback) {
  const rawValue = process.env[key];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

module.exports = {
  checkWorldGateHealth,
  generateJsonText,
  WORLDGATE_MODEL,
  WORLDGATE_BASE_URL,
};
