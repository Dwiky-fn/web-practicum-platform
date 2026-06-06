const express = require('express');

module.exports = (handler) => {
  const router = express.Router();

  router.put('/lecturer/submissions/:submissionId/review', (req, res) =>
    handler.putSubmissionReviewHandler(
      {
        ...req,
        body: {
          ...req.body,
          submissionId: req.params.submissionId,
        },
      },
      res,
    ));

  return router;
};
