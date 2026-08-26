const OpenAI = require('openai');
const AppError = require('../utils/AppError');
const ConcurrencyLimiter = require('../utils/concurrencyLimiter');
const logger = require('../utils/logger');
const ollamaService = require('./ollamaService');

const maxConcurrent = readNumberEnv('AI_MAX_CONCURRENT_REQUESTS', 1);
const limiter = new ConcurrencyLimiter(maxConcurrent);

function getMindRouterConfig() {
  return {
    model: process.env.MINDROUTER_MODEL,
    baseURL: process.env.MINDROUTER_BASE_URL,
  };
}

function getMindRouterClient() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new AppError('MINDROUTER_API_KEY belum dikonfigurasi di environment variable', {
      statusCode: 500,
      code: 'MINDROUTER_CONFIG_ERROR',
    });
  }

  const { baseURL } = getMindRouterConfig();
  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
}

async function checkMindRouterHealth() {
  const { model } = getMindRouterConfig();
  const apiKey = process.env.MINDROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      connected: false,
      model,
      modelAvailable: false,
      message: 'MINDROUTER_API_KEY belum dikonfigurasi',
    };
  }

  try {
    const client = getMindRouterClient();
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Respond with OK' }],
      max_tokens: 10,
    });

    const isOk = Boolean(response.choices && response.choices.length > 0);
    return {
      connected: isOk,
      model,
      modelAvailable: isOk,
      message: isOk ? 'MindRouter API terhubung dan model tersedia' : 'MindRouter API tidak memberikan respon valid',
    };
  } catch (error) {
    return {
      connected: false,
      model,
      modelAvailable: false,
      message: `Pemeriksaan koneksi MindRouter gagal: ${error.message}`,
    };
  }
}

function isRetryableError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  if ([429, 502, 503, 504].includes(status)) return true;
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.type === 'timeout') {
    return true;
  }
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('429') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('bad gateway') || msg.includes('rate limit')) {
    return true;
  }
  return false;
}

function parseRetryAfterDelay(error) {
  let seconds = 0;
  if (error.headers) {
    const headerVal = error.headers.get ? error.headers.get('retry-after') : error.headers['retry-after'];
    if (headerVal) {
      const parsed = Number(headerVal);
      if (Number.isFinite(parsed) && parsed > 0) seconds = parsed;
    }
  }
  if (!seconds && error.error && typeof error.error.retry_after === 'number') {
    seconds = error.error.retry_after;
  }
  if (!seconds && typeof error.retry_after === 'number') {
    seconds = error.retry_after;
  }
  return seconds * 1000;
}

function calculateBackoffDelay(attempt, error) {
  const retryAfterMs = parseRetryAfterDelay(error);
  const baseDelayMs = 2000;
  const expDelayMs = Math.pow(2, attempt - 1) * baseDelayMs;
  const jitterMs = Math.floor(Math.random() * 1000);
  const calculatedDelay = expDelayMs + jitterMs;
  return Math.max(retryAfterMs, calculatedDelay);
}

async function generateJsonText(params) {
  return limiter.run(async () => {
    const startedAt = Date.now();
    const { systemPrompt, userPrompt, requestId } = params;
    const { model } = getMindRouterConfig();
    const timeoutMs = readNumberEnv('AI_REQUEST_TIMEOUT_MS', 300000);
    const temperature = readNumberEnv('AI_TEMPERATURE', 0.1);
    const maxRetries = readNumberEnv('MINDROUTER_MAX_RETRIES', readNumberEnv('AI_MAX_RETRIES', 3));
    const maxAttempts = maxRetries + 1;

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      logger.info('[MindRouter] Request started', {
        requestId,
        model,
        attempt,
        maxAttempts,
        activeRequests: limiter.getActiveCount(),
        pendingRequests: limiter.getPendingCount(),
      });

      try {
        const client = getMindRouterClient();
        const response = await client.chat.completions.create(
          {
            model,
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
          logger.error('[MindRouter] Request empty response', { requestId, model, attempt });
          throw new AppError('Response MindRouter tidak memiliki output evaluasi', {
            statusCode: 502,
            code: 'MINDROUTER_EMPTY_RESPONSE',
          });
        }

        logger.info('[MindRouter] Request completed successfully', {
          requestId,
          model,
          attempt,
          durationMs: Date.now() - startedAt,
          provider: 'mindrouter',
        });

        return content;
      } catch (error) {
        lastError = error;
        const status = error.status || error.statusCode || 500;
        const errorMsg = error.message || 'Error tidak diketahui dari MindRouter API';
        const retryable = isRetryableError(error);

        if (retryable && attempt < maxAttempts) {
          const retryDelayMs = calculateBackoffDelay(attempt, error);
          logger.warn('[MindRouter] Request failed with retryable status, scheduling retry with backoff', {
            requestId,
            provider: 'mindrouter',
            model,
            status,
            error: errorMsg,
            attempt,
            maxAttempts,
            retryDelayMs,
            activeRequests: limiter.getActiveCount(),
            pendingRequests: limiter.getPendingCount(),
          });
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        logger.error('[MindRouter] Request failed, exhausted retries or non-retryable error, initiating fallback to Ollama', {
          requestId,
          provider: 'mindrouter',
          model,
          status,
          attempt,
          maxAttempts,
          error: errorMsg,
          fallback: 'ollama',
        });
        break;
      }
    }

    try {
      logger.info('[MindRouter] Executing Ollama fallback', { requestId });
      const fallbackContent = await ollamaService.generateJsonText(params);
      logger.info('[MindRouter] Ollama fallback succeeded', { requestId });
      return fallbackContent;
    } catch (fallbackError) {
      const status = lastError?.status || lastError?.statusCode || 500;
      const errorMsg = lastError?.message || 'Error tidak diketahui dari MindRouter API';

      logger.error('[MindRouter] Fallback Ollama also failed', {
        requestId,
        fallbackError: fallbackError.message,
      });

      if (lastError instanceof AppError && lastError.code === 'MINDROUTER_CONFIG_ERROR') {
        throw lastError;
      }

      throw new AppError(`MindRouter API mengalami kendala (${errorMsg}) dan fallback Ollama juga gagal: ${fallbackError.message}`, {
        statusCode: status >= 500 ? 502 : status,
        code: 'MINDROUTER_API_ERROR',
        details: [
          { status, message: errorMsg },
          { fallbackMessage: fallbackError.message },
        ],
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
  checkMindRouterHealth,
  generateJsonText,
  getMindRouterConfig,
  isRetryableError,
  calculateBackoffDelay,
};
