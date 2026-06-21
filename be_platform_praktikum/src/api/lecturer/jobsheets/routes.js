const express = require('express');
const { requireAuth, requireRoles } = require('../../../middlewares/auth');

module.exports = (handler) => {
  const router = express.Router();
  router.use('/lecturer', requireAuth, requireRoles('DOSEN'));

  // Compatibility routes only.
  // courseId in these routes represents mataKuliahId; do not query the legacy courses table.
  router.post('/lecturer/courses/:courseId/jobsheets', handler.postJobsheetHandler);
  router.put('/lecturer/courses/:courseId/jobsheets/:jobsheetId', handler.putJobsheetHandler);
  router.delete('/lecturer/courses/:courseId/jobsheets/:jobsheetId', handler.deleteJobsheetHandler);
  router.put(
    '/lecturer/courses/:courseId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetHandler,
  );
  router.post('/lecturer/mata-kuliah/:mataKuliahId/jobsheets', handler.postJobsheetByMataKuliahHandler);
  router.put('/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId', handler.putJobsheetByMataKuliahHandler);
  router.delete('/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId', handler.deleteJobsheetByMataKuliahHandler);
  router.put(
    '/lecturer/mata-kuliah/:mataKuliahId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetByMataKuliahHandler,
  );
  router.post('/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets', handler.postJobsheetByKelasPraktikumHandler);
  router.put('/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId', handler.putJobsheetByKelasPraktikumHandler);
  router.delete('/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId', handler.deleteJobsheetByKelasPraktikumHandler);
  router.put(
    '/lecturer/kelas-praktikum/:kelasPraktikumId/jobsheets/:jobsheetId/publish',
    handler.publishJobsheetByKelasPraktikumHandler,
  );

  // Remedial routes
  router.post('/lecturer/jobsheets/:jobsheetId/remedials', handler.postRemedialHandler);
  router.get('/lecturer/jobsheets/:jobsheetId/remedials', handler.getRemedialsHandler);
  router.delete('/lecturer/remedials/:remedialId', handler.deleteRemedialHandler);
  router.post('/lecturer/remedials/:remedialId/students', handler.postRemedialStudentsHandler);
  router.get('/lecturer/remedials/:remedialId/students', handler.getRemedialStudentsHandler);

  return router;
};
