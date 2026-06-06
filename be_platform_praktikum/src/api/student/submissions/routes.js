const express = require('express');
const {
  requireRoles,
  requireTargetUserOrRoles,
} = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.post(
    '/courses/:courseId/submissions',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    handler.postSubmissionHandler,
  );

  router.get(
    '/courses/:courseId/submissions/:jobsheetId',
    requireTargetUserOrRoles('studentId', 'DOSEN', 'ADMIN'),
    handler.getSubmissionHandler,
  );

  router.get(
    '/courses/:courseId/submissions/:jobsheetId/ensure',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    handler.getOrCreateSubmissionHandler,
  );

  router.put(
    '/courses/:courseId/submissions/:jobsheetId',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    handler.putSubmissionHandler,
  );

  router.patch(
    '/courses/:courseId/submissions/:jobsheetId/submit',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    handler.submitSubmissionHandler,
  );
  return router;
};

module.exports = routes;
