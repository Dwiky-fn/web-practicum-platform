const {
  validateEvaluationRequest,
} = require('../schemas/evaluationRequestSchema');
const {
  evaluateSubmission,
} = require('../services/evaluationService');

async function evaluationController(req, res, next) {
  const startedAt = Date.now();

  try {
    const { error, value } = validateEvaluationRequest(req.body);

    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'Payload evaluasi tidak valid',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.details.map((detail) => ({
            message: detail.message.replace(/"/g, ''),
            path: detail.path.join('.'),
            type: detail.type,
          })),
        },
        meta: {
          requestId: req.requestId || null,
        },
      });
    }

    const payload = {
      ...value,
      requestId: value.requestId || req.requestId,
    };

    const result = await evaluateSubmission(payload);

    return res.status(200).json({
      status: 'success',
      data: result,
      meta: {
        requestId: payload.requestId,
        model: process.env.OLLAMA_MODEL || null,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = evaluationController;
