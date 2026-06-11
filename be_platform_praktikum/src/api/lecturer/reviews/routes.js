const express = require('express');
const { requireAuth, requireRoles } = require('../../../middlewares/auth');

module.exports = (handler) => {
  const router = express.Router();

  router.put(
    '/lecturer/submissions/:submissionId/review',
    requireAuth,
    requireRoles('DOSEN'),
    (req, res) =>
      handler.putSubmissionReviewHandler(
        {
          ...req,
          body: {
            ...req.body,
            submissionId: req.params.submissionId,
          },
        },
        res,
      ),
  );

  router.post(
    '/lecturer/submissions/:submissionId/trigger-ai',
    requireAuth,
    requireRoles('DOSEN'),
    (req, res) => handler.postTriggerAiHandler(req, res),
  );

  router.post(
    '/lecturer/submissions/:submissionId/ai-review/retry',
    requireAuth,
    requireRoles('DOSEN'),
    (req, res) => handler.postRetryAiHandler(req, res),
  );

  return router;
};
