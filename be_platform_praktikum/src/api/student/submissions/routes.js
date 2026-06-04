const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/courses/:courseId/submissions', handler.postSubmissionHandler);

  router.get(
    '/courses/:courseId/submissions/:jobsheetId',
    handler.getSubmissionHandler,
  );

  router.get(
    '/courses/:courseId/submissions/:jobsheetId/ensure',
    handler.getOrCreateSubmissionHandler,
  );

  router.put('/courses/:courseId/submissions/:jobsheetId', handler.putSubmissionHandler);

  router.patch(
    '/courses/:courseId/submissions/:jobsheetId/submit',
    handler.submitSubmissionHandler,
  );
  return router;
};

module.exports = routes;
