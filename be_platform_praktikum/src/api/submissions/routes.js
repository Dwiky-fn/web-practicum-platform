const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/submissions', handler.postSubmissionHandler);

  router.get('/submissions/:jobsheetId', handler.getSubmissionHandler);

  router.put('/submissions/:jobsheetId', handler.putSubmissionHandler);

  return router;
};

module.exports = routes;
