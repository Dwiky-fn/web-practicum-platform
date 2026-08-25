const { checkProviderHealth } = require('../services/aiProvider');

async function healthController(req, res) {
  const startedAt = Date.now();
  const providerHealth = await checkProviderHealth();
  const isHealthy = providerHealth.connected;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'success' : 'fail',
    service: 'ai-evaluator',
    message: isHealthy
      ? `AI Evaluator Service (${providerHealth.provider}) siap digunakan`
      : providerHealth.message,
    provider: providerHealth.provider,
    health: providerHealth,
    meta: {
      requestId: req.requestId || null,
      durationMs: Date.now() - startedAt,
    },
  });
}

module.exports = healthController;
