const express = require('express');
const { requireAuth, requireRoles } = require('../../../middlewares/auth');

module.exports = (handler) => {
  const router = express.Router();

  router.get(
    '/lecturer/jobsheets/:jobsheetId/progress',
    requireAuth,
    requireRoles('DOSEN'),
    handler.getClassProgressHandler,
  );

  router.get(
    '/lecturer/jobsheets/:jobsheetId/progress/:studentId',
    requireAuth,
    requireRoles('DOSEN'),
    handler.getStudentDetailProgressHandler,
  );

  return router;
};
