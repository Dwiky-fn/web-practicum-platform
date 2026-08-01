const {
  validateEvaluationRequest,
} = require('../schemas/evaluationRequestSchema');
const { evaluateSubmission } = require('../services/evaluationService');

const activeEvaluations = new Set();

async function sendWebhookCallback(webhookUrl, payload) {
  try {
    console.log(
      `[AI Service Webhook] Mengirim callback evaluasi ke: ${webhookUrl}`,
    );
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
      console.error(
        `[AI Service Webhook] Webhook merespon HTTP ${response.status}: ${errText}`,
      );
    } else {
      console.log(
        `[AI Service Webhook] Callback berhasil terkirim ke LMS Backend (HTTP ${response.status})`,
      );
    }
  } catch (error) {
    console.error(
      `[AI Service Webhook] Gagal mengirim webhook callback:`,
      error.message,
    );
  }
}

async function evaluationController(req, res, next) {
  const submissionId = req.body?.submissionId || req.body?.submission?.id;
  const webhookUrl =
    req.body?.options?.webhookUrl ||
    req.body?.options?.callbackUrl ||
    req.body?.webhookUrl ||
    req.body?.callbackUrl ||
    process.env.LMS_WEBHOOK_URL ||
    'https://be.dwkyjnrdi.my.id/api/internal/ai-callback';

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
    // === DEBUG: Log payload yang masuk untuk diagnosis ===
    console.log(
      '[AI Service] Incoming payload keys:',
      req.body && typeof req.body === 'object'
        ? Object.keys(req.body)
        : 'NOT_OBJECT',
    );
    console.log('[AI Service] Payload scope:', req.body?.scope);
    console.log('[AI Service] Payload schemaVersion:', req.body?.schemaVersion);
    console.log(
      '[AI Service] Payload submissionId:',
      req.body?.submissionId || req.body?.submission?.id,
    );
    console.log(
      '[AI Service] Payload options keys:',
      req.body?.options ? Object.keys(req.body.options) : 'NO_OPTIONS',
    );
    if (req.body?.experiments) {
      console.log(
        '[AI Service] experiments count:',
        req.body.experiments.length,
      );
      if (req.body.experiments[0]) {
        console.log(
          '[AI Service] experiments[0] keys:',
          Object.keys(req.body.experiments[0]),
        );
        console.log(
          '[AI Service] experiments[0].id:',
          req.body.experiments[0].id,
        );
        console.log(
          '[AI Service] experiments[0].title:',
          req.body.experiments[0].title,
        );
        console.log(
          '[AI Service] experiments[0].files count:',
          req.body.experiments[0].files?.length,
        );
      }
    }
    if (req.body?.exercises) {
      console.log('[AI Service] exercises count:', req.body.exercises.length);
    }
    if (req.body?.context) {
      console.log('[AI Service] context keys:', Object.keys(req.body.context));
      console.log(
        '[AI Service] context.programmingLanguage:',
        req.body.context?.programmingLanguage,
      );
    }
    if (req.body?.submission) {
      console.log(
        '[AI Service] submission keys:',
        Object.keys(req.body.submission),
      );
      console.log(
        '[AI Service] submission.source:',
        req.body.submission?.source,
      );
      console.log(
        '[AI Service] submission.attemptType:',
        req.body.submission?.attemptType,
      );
    }
    if (req.body?.jobsheet) {
      console.log(
        '[AI Service] jobsheet keys:',
        Object.keys(req.body.jobsheet),
      );
    }

    const { error, value } = validateEvaluationRequest(req.body);

    if (error) {
      if (submissionId) activeEvaluations.delete(submissionId);

      // === DEBUG: Log validation error details ===
      console.error('[AI Service] ❌ VALIDATION FAILED!');
      console.error(
        '[AI Service] Error details:',
        JSON.stringify(
          error.details.map((d) => ({
            message: d.message,
            path: d.path.join('.'),
            type: d.type,
          })),
          null,
          2,
        ),
      );

      // Log deeper nested "details" from Joi.alternatives
      if (error.details[0]?.context?.details) {
        for (const alt of error.details[0].context.details) {
          console.error(
            '[AI Service] Alternative match error:',
            JSON.stringify(
              alt.details?.map((dd) => ({
                message: dd.message,
                path: dd.path?.join('.'),
                type: dd.type,
              })),
              null,
              2,
            ),
          );
        }
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
        console.log(
          `[AI Background Job] Memulai evaluasi Ollama untuk submission: ${submissionId}`,
        );
        const result = await evaluateSubmission(payload);

        console.log(
          `[AI Background Job] Evaluasi selesai dalam ${Date.now() - startedAt}ms. Mengirim Webhook Callback...`,
        );
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
        console.error(
          `[AI Background Job] Evaluasi gagal untuk submission ${submissionId}:`,
          evalError.message,
        );
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
