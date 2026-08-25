const OpenAI = require('openai');
const AppError = require('../utils/AppError');
const ConcurrencyLimiter = require('../utils/concurrencyLimiter');
const logger = require('../utils/logger');

const maxConcurrent = readNumberEnv('AI_MAX_CONCURRENT_REQUESTS', 1);
const limiter = new ConcurrencyLimiter(maxConcurrent);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError('GEMINI_API_KEY belum dikonfigurasi di environment variable', {
      statusCode: 500,
      code: 'GEMINI_CONFIG_ERROR',
    });
  }

  return new OpenAI({
    apiKey,
    baseURL: GEMINI_BASE_URL,
  });
}

async function checkGeminiHealth() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      connected: false,
      model: GEMINI_MODEL,
      modelAvailable: false,
      message: 'GEMINI_API_KEY belum dikonfigurasi',
    };
  }

  try {
    const client = getGeminiClient();
    const response = await client.chat.completions.create({
      model: GEMINI_MODEL,
      messages: [{ role: 'user', content: 'Respond with OK' }],
      max_tokens: 10,
    });

    const isOk = Boolean(response.choices && response.choices.length > 0);
    return {
      connected: isOk,
      model: GEMINI_MODEL,
      modelAvailable: isOk,
      message: isOk ? 'Gemini API terhubung dan model tersedia' : 'Gemini API tidak memberikan respon valid',
    };
  } catch (error) {
    return {
      connected: false,
      model: GEMINI_MODEL,
      modelAvailable: false,
      message: `Pemeriksaan koneksi Gemini gagal: ${error.message}`,
    };
  }
}

async function generateJsonText({ systemPrompt, userPrompt, requestId }) {
  return limiter.run(async () => {
    const startedAt = Date.now();
    const timeoutMs = readNumberEnv('AI_REQUEST_TIMEOUT_MS', 300000);
    const temperature = readNumberEnv('AI_TEMPERATURE', 0.1);

    logger.info('[Gemini] Request started', {
      requestId,
      model: GEMINI_MODEL,
      activeRequests: limiter.getActiveCount(),
      pendingRequests: limiter.getPendingCount(),
    });

    try {
      const client = getGeminiClient();
      const response = await client.chat.completions.create(
        {
          model: GEMINI_MODEL,
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
        logger.error('[Gemini] Request empty response', { requestId, model: GEMINI_MODEL });
        throw new AppError('Response Gemini tidak memiliki output evaluasi', {
          statusCode: 502,
          code: 'GEMINI_EMPTY_RESPONSE',
        });
      }

      logger.info('[Gemini] Request completed', {
        requestId,
        model: GEMINI_MODEL,
        durationMs: Date.now() - startedAt,
      });

      return content;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const status = error.status || error.statusCode || 500;
      const errorMsg = error.message || 'Error tidak diketahui dari Gemini API';

      if (status === 401 || status === 403) {
        logger.error('[Gemini] Request failed', { requestId, status, error: errorMsg });
        throw new AppError('Autentikasi Gemini API gagal. Periksa GEMINI_API_KEY.', {
          statusCode: 401,
          code: 'GEMINI_AUTH_ERROR',
          details: [{ status, message: errorMsg }],
        });
      }

      if (status === 429) {
        logger.error('[Gemini] Request failed', { requestId, status, error: errorMsg });
        throw new AppError('Batas rate limit / kuota Gemini API terlampaui.', {
          statusCode: 429,
          code: 'GEMINI_RATE_LIMIT',
          details: [{ status, message: errorMsg }],
        });
      }

      if (error.name === 'APIConnectionTimeoutError' || error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        logger.error('[Gemini] Request timeout', { requestId, timeoutMs });
        throw new AppError('Evaluasi Gemini API melewati batas waktu', {
          statusCode: 504,
          code: 'GEMINI_TIMEOUT',
        });
      }

      logger.error('[Gemini] Request failed', { requestId, status, error: errorMsg });
      throw new AppError(`Gemini API mengalami kendala: ${errorMsg}`, {
        statusCode: status >= 500 ? 502 : status,
        code: 'GEMINI_API_ERROR',
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
  checkGeminiHealth,
  generateJsonText,
  GEMINI_MODEL,
  GEMINI_BASE_URL,
};
