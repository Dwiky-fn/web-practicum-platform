const express = require('express');
const router = express.Router();
const AiEvaluationQueue = require('../../services/execution/AiEvaluationQueue');

/**
 * Middleware untuk memvalidasi API Key dari AI Service
 */
function validateAiServiceApiKey(req, res, next) {
  const apiKey = req.headers['x-ai-service-key'];
  const expectedKey = process.env.AI_SERVICE_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    console.warn('[Webhook AI Callback] Unauthorized request - Invalid X-AI-Service-Key header');
    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized: Invalid AI Service API Key',
    });
  }
  next();
}

/**
 * POST /api/internal/ai-callback
 * Endpoint Webhook yang dipanggil oleh AI Evaluator Service setelah evaluasi Ollama selesai
 */
router.post('/ai-callback', validateAiServiceApiKey, async (req, res, next) => {
  try {
    const { submissionId, status, data, error } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        status: 'fail',
        message: 'submissionId wajib diisi dalam payload webhook',
      });
    }

    console.log(`[Webhook AI Callback] Menerima callback evaluasi AI untuk submissionId: ${submissionId}, Status: ${status}`);

    // Memproses dan menyimpan hasil akhir ke PostgreSQL database
    await AiEvaluationQueue.processAndSaveAiResult(submissionId, { status, data, error });

    return res.status(200).json({
      status: 'success',
      message: 'Hasil evaluasi AI berhasil diproses dan disimpan ke database',
    });
  } catch (err) {
    console.error(`[Webhook AI Callback] Error saat memproses callback untuk submission:`, err);
    return next(err);
  }
});

module.exports = router;
