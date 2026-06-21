const express = require('express');
const { requireAuth, requireRoles } = require('../../../middlewares/auth');

module.exports = (handler) => {
  const router = express.Router();
  router.use('/lecturer', requireAuth, requireRoles('DOSEN'));

  router.get(
    '/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/monitoring',
    handler.getMonitoringHandler,
  );

  router.get(
    '/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/monitoring/location',
    handler.getLocationDetailHandler,
  );

  router.get(
    '/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/students/:studentId/workpage',
    handler.getStudentWorkpageHandler,
  );

  router.get(
    '/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/students/:studentId/monitor',
    handler.getStudentWorkpageHandler,
  );

  return router;
};
