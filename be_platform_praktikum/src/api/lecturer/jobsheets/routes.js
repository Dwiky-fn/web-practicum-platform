const express = require('express');

module.exports = (handler) => {
  const router = express.Router();

  router.post('/lecturer/courses/:courseId/jobsheets', handler.postJobsheetHandler);
  router.put('/lecturer/courses/:courseId/jobsheets/:jobsheetId', handler.putJobsheetHandler);
  router.put(
    '/lecturer/courses/:courseId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetHandler,
  );
  router.post('/lecturer/mata-kuliah/:mataKuliahId/jobsheets', handler.postJobsheetByMataKuliahHandler);
  router.put('/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId', handler.putJobsheetByMataKuliahHandler);
  router.put(
    '/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetByMataKuliahHandler,
  );

  return router;
};
