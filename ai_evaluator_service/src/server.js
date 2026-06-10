require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const studentEvaluation = require('./api/evaluation');
const health = require('./api/health');
const requestId = require('./middlewares/requestId');
const errorHandler = require('./middlewares/errorHandler');

validateEnvironment();

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestId);

// register routes
health(app);
studentEvaluation(app);

// test route
app.get('/', (req, res) => {
  res.send('AI Evaluator Service is running');
});

// error middleware harus diletakkan paling akhir
app.use(errorHandler);

// start server
const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AI Evaluator Service running on http://localhost:${PORT}`);
    console.log(`Ollama model: ${process.env.OLLAMA_MODEL}`);
  });
}

function validateEnvironment() {
  const requiredVariables = ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'];
  const missingVariables = requiredVariables.filter(
    (key) => !process.env[key] || !process.env[key].trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Environment variable belum diisi: ${missingVariables.join(', ')}`,
    );
  }

  const numericVariables = [
    ['AI_TEMPERATURE', 0.1, 0, 2],
    ['AI_CONTEXT_LENGTH', 4096, 512, 131072],
    ['AI_REQUEST_TIMEOUT_MS', 300000, 1000, 3600000],
    ['AI_MAX_CONCURRENT_REQUESTS', 1, 1, 10],
    ['AI_MAX_RETRIES', 2, 0, 10],
  ];

  numericVariables.forEach(([key, fallback, min, max]) => {
    const rawValue = process.env[key];
    const value = rawValue === undefined || rawValue === ''
      ? fallback
      : Number(rawValue);

    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(
        `${key} harus berupa angka antara ${min} dan ${max}`,
      );
    }
  });
}

module.exports = {
  app,
  server,
  validateEnvironment,
};
