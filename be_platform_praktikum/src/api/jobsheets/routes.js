const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/courses/:courseId/jobsheets/:jobsheetId/full', handler.getJobsheetFullHandler);

  return router;
};

module.exports = routes;
