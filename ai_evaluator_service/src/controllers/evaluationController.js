const {
  validateEvaluationRequest,
} = require('../schemas/evaluationRequestSchema');
const {
  evaluateSubmission,
} = require('../services/evaluationService');

const activeEvaluations = new Set();

async function sendWebhookCallback(webhookUrl, payload) {
  try {
    console.log(`[AI Service Webhook] Mengirim callback evaluasi ke: ${webhookUrl}`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Key': process.env.AI_SERVICE_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Service Webhook] Webhook merespon HTTP ${response.status}: ${errText}`);
    } else {
      console.log(`[AI Service Webhook] Callback berhasil terkirim ke LMS Backend (HTTP ${response.status})`);
    }
  } catch (error) {
    console.error(`[AI Service Webhook] Gagal mengirim webhook callback:`, error.message);
  }
}

async function evaluationController(req, res, next) {
  const submissionId = req.body?.submissionId || req.body?.submission?.id;
  const webhookUrl = req.body?.options?.webhookUrl 
    || process.env.LMS_WEBHOOK_URL 
    || 'http://localhost:3000/api/internal/ai-callback';

  if (submissionId) {
    if (activeEvaluations.has(submissionId)) {
      return res.status(409).json({
        status: 'fail',
        message: 'Evaluation already running for this submission',
      });
    }
    activeEvaluations.add(submissionId);
  }

  try {
    const { error, value } = validateEvaluationRequest(req.body);

    if (error) {
      if (submissionId) activeEvaluations.delete(submissionId);
      if (process.env.AI_EVALUATOR_DEBUG_PAYLOAD === 'true') {
        console.warn('[AI Service] Payload validation failed', {
          rootKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
          schemaVersion: req.body?.schemaVersion || null,
          scope: req.body?.scope || null,
          details: error.details.map((detail) => ({
            message: detail.message.replace(/"/g, ''),
            path: detail.path.join('.'),
            type: detail.type,
          })),
        });
      }

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

    // 1. Balas HTTP 202 Accepted secara LANGSUNG (non-blocking)
    res.status(202).json({
      status: 'accepted',
      message: 'Evaluasi AI telah diterima dan diproses di background',
      data: {
        submissionId,
      },
      meta: {
        requestId: payload.requestId,
      },
    });

    // 2. Jalankan proses evaluasi Ollama di Background Task
    setImmediate(async () => {
      const startedAt = Date.now();
      try {
        console.log(`[AI Background Job] Memulai evaluasi Ollama untuk submission: ${submissionId}`);
        const result = await evaluateSubmission(payload);

        console.log(`[AI Background Job] Evaluasi selesai dalam ${Date.now() - startedAt}ms. Mengirim Webhook Callback...`);
        await sendWebhookCallback(webhookUrl, {
          status: 'success',
          submissionId,
          data: result,
          meta: {
            requestId: payload.requestId,
            model: process.env.OLLAMA_MODEL || null,
            durationMs: Date.now() - startedAt,
          },
        });
      } catch (evalError) {
        console.error(`[AI Background Job] Evaluasi gagal untuk submission ${submissionId}:`, evalError.message);
        await sendWebhookCallback(webhookUrl, {
          status: 'failed',
          submissionId,
          error: evalError.message,
          meta: {
            requestId: payload.requestId,
          },
        });
      } finally {
        if (submissionId) {
          activeEvaluations.delete(submissionId);
        }
      }
    });
  } catch (error) {
    if (submissionId) activeEvaluations.delete(submissionId);
    return next(error);
  }
}

module.exports = evaluationController;
