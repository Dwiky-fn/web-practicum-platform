function internalApiKey(req, res, next) {
  const configuredApiKey = process.env.AI_SERVICE_API_KEY || '';

  // Auth dinonaktifkan selama env masih kosong.
  if (!configuredApiKey) {
    return next();
  }

  const incomingApiKey = req.headers['x-ai-service-key'];

  if (incomingApiKey !== configuredApiKey) {
    return res.status(401).json({
      status: 'fail',
      message: 'API key internal tidak valid',
      error: {
        code: 'INVALID_API_KEY',
        details: [],
      },
      meta: {
        requestId: req.requestId || null,
      },
    });
  }

  return next();
}

module.exports = internalApiKey;
