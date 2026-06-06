const express = require('express');

module.exports = (handler) => {
  const router = express.Router();

  router.post('/lecturer/courses/:courseId/jobsheets', handler.postJobsheetHandler);
  router.put('/lecturer/courses/:courseId/jobsheets/:jobsheetId', handler.putJobsheetHandler);
  router.put(
    '/lecturer/courses/:courseId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetHandler,
  );

  return router;
};
