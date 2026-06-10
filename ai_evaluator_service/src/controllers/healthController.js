const {
  checkOllamaHealth,
} = require('../services/ollamaService');

async function healthController(req, res) {
  const startedAt = Date.now();
  const ollamaHealth = await checkOllamaHealth();
  const isHealthy = ollamaHealth.connected && ollamaHealth.modelAvailable;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'success' : 'fail',
    service: 'ai-evaluator',
    message: isHealthy
      ? 'AI Evaluator Service siap digunakan'
      : ollamaHealth.message,
    ollama: {
      status: ollamaHealth.connected ? 'connected' : 'disconnected',
      model: ollamaHealth.model,
      modelAvailable: ollamaHealth.modelAvailable,
    },
    meta: {
      requestId: req.requestId || null,
      durationMs: Date.now() - startedAt,
    },
  });
}

module.exports = healthController;
