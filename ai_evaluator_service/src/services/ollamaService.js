const AppError = require('../utils/AppError');
const ConcurrencyLimiter = require('../utils/concurrencyLimiter');
const logger = require('../utils/logger');
const http = require('http');

const maxConcurrent = readNumberEnv('AI_MAX_CONCURRENT_REQUESTS', 1);
const limiter = new ConcurrencyLimiter(maxConcurrent);

function getOllamaBaseUrl() {
  return String(
    process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ).replace(/\/+$/, '');
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL || '';
}

async function checkOllamaHealth() {
  const baseUrl = getOllamaBaseUrl();
  const configuredModel = getOllamaModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        connected: false,
        model: configuredModel,
        modelAvailable: false,
        message: `Ollama memberikan HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    const availableModelNames = models
      .map((item) => item.name || item.model)
      .filter(Boolean);

    const modelAvailable = availableModelNames.some(
      (modelName) =>
        modelName === configuredModel
        || modelName.startsWith(`${configuredModel}:`)
        || configuredModel.startsWith(`${modelName}:`),
    );

    return {
      connected: true,
      model: configuredModel,
      modelAvailable,
      availableModels: availableModelNames,
      message: modelAvailable
        ? 'Ollama terhubung dan model tersedia'
        : 'Ollama terhubung, tetapi model belum tersedia',
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        connected: false,
        model: configuredModel,
        modelAvailable: false,
        message: 'Pemeriksaan koneksi Ollama mengalami timeout',
      };
    }

    return {
      connected: false,
      model: configuredModel,
      modelAvailable: false,
      message: 'Ollama tidak dapat dihubungi',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function httpPost(url, body, signal) {
  if (process.env.NODE_ENV === 'test') {
    return fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    });
  }
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 0, // Batalkan pembatasan waktu timeout
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => responseBody,
          json: async () => JSON.parse(responseBody),
        });
      });
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        req.destroy();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function generateJsonText({ systemPrompt, userPrompt, requestId }) {
  return limiter.run(async () => {
    const startedAt = Date.now();
    const baseUrl = getOllamaBaseUrl();
    const model = getOllamaModel();
    const timeoutMs = readNumberEnv('AI_REQUEST_TIMEOUT_MS', 300000);
    const temperature = readNumberEnv('AI_TEMPERATURE', 0.1);
    const contextLength = readNumberEnv('AI_CONTEXT_LENGTH', 4096);
    const controller = new AbortController();
    // const timeout = setTimeout(() => controller.abort(), timeoutMs);

    logger.info('Ollama request started', {
      requestId,
      model,
      activeRequests: limiter.getActiveCount(),
      pendingRequests: limiter.getPendingCount(),
    });

    try {
      const requestBody = JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature,
          num_ctx: contextLength,
        },
      });

      const response = await httpPost(`${baseUrl}/api/generate`, requestBody, controller.signal);

      if (!response.ok) {
        const responseText = await response.text();
        throw new AppError('Ollama tidak dapat memproses evaluasi', {
          statusCode: 502,
          code: 'OLLAMA_BAD_RESPONSE',
          details: [
            {
              status: response.status,
              message: responseText.slice(0, 500),
            },
          ],
        });
      }

      const data = await response.json();

      if (typeof data.response !== 'string' || !data.response.trim()) {
        throw new AppError('Response Ollama tidak memiliki output evaluasi', {
          statusCode: 502,
          code: 'OLLAMA_EMPTY_RESPONSE',
        });
      }

      logger.info('Ollama request completed', {
        requestId,
        model,
        durationMs: Date.now() - startedAt,
      });

      return data.response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AppError('Evaluasi AI melewati batas waktu', {
          statusCode: 504,
          code: 'OLLAMA_TIMEOUT',
        });
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Ollama tidak dapat dihubungi', {
        statusCode: 502,
        code: 'OLLAMA_UNAVAILABLE',
        details: [{ message: error.message }],
      });
    } finally {
      // clearTimeout(timeout);
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
  checkOllamaHealth,
  generateJsonText,
  getOllamaBaseUrl,
  getOllamaModel,
};
