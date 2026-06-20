const express = require('express');
const {
  requireRoles,
  requireTargetUserOrRoles,
} = require('../../../middlewares/auth');
const asyncHandler = require('../../../utils/asyncHandler');

const routes = (handler) => {
  const router = express.Router();

  router.post(
    '/courses/:courseId/submissions',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.postSubmissionHandler),
  );

  router.get(
    '/courses/:courseId/submissions/:jobsheetId',
    requireTargetUserOrRoles('studentId', 'DOSEN', 'ADMIN'),
    asyncHandler(handler.getSubmissionHandler),
  );

  router.get(
    '/courses/:courseId/submissions/:jobsheetId/ensure',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.getOrCreateSubmissionHandler),
  );

  router.put(
    '/courses/:courseId/submissions/:jobsheetId',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.putSubmissionHandler),
  );

  router.patch(
    '/courses/:courseId/submissions/:jobsheetId/submit',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.submitSubmissionHandler),
  );
  router.post(
    '/mata-kuliah/:mataKuliahId/submissions',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.postSubmissionHandler),
  );
  router.get(
    '/mata-kuliah/:mataKuliahId/submissions/:jobsheetId',
    requireTargetUserOrRoles('studentId', 'DOSEN', 'ADMIN'),
    asyncHandler(handler.getSubmissionHandler),
  );
  router.get(
    '/mata-kuliah/:mataKuliahId/submissions/:jobsheetId/ensure',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.getOrCreateSubmissionHandler),
  );
  router.put(
    '/mata-kuliah/:mataKuliahId/submissions/:jobsheetId',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.putSubmissionHandler),
  );
  router.patch(
    '/mata-kuliah/:mataKuliahId/submissions/:jobsheetId/submit',
    requireRoles('MAHASISWA'),
    requireTargetUserOrRoles('studentId'),
    asyncHandler(handler.submitSubmissionHandler),
  );

  router.get(
    '/student/jobsheets/:jobsheetId/history',
    requireRoles('MAHASISWA'),
    asyncHandler(handler.getSubmissionHistoryHandler),
  );

  return router;
};

module.exports = routes;
