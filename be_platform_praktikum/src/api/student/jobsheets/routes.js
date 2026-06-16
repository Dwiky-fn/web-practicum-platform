const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/courses/:courseId/jobsheets', handler.getJobsheetsByCourseHandler);

  router.get('/courses/:courseId/jobsheets/:jobsheetId/full', handler.getJobsheetFullHandler);
  router.get('/mata-kuliah/:mataKuliahId/jobsheets', handler.getJobsheetsByMataKuliahHandler);
  router.get('/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/full', handler.getJobsheetFullByMataKuliahHandler);

  return router;
};

module.exports = routes;
