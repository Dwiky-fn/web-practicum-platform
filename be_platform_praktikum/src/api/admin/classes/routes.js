const express = require('express');
const { requireRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/academic/classes', requireRoles('ADMIN', 'DOSEN'), handler.getClassesHandler);
  router.post('/admin/academic/classes', requireRoles('ADMIN'), handler.createClassHandler);
  router.get('/admin/classes/:id', requireRoles('ADMIN', 'DOSEN'), handler.getClassByIdHandler);
  router.put('/admin/classes/:id', requireRoles('ADMIN'), handler.updateClassHandler);
  router.delete('/admin/classes/:id', requireRoles('ADMIN'), handler.deleteClassHandler);
  router.get(
    '/admin/classes/:id/student-candidates',
    requireRoles('ADMIN'),
    handler.getStudentCandidatesHandler,
  );
  router.post('/admin/classes/:id/students', requireRoles('ADMIN'), handler.assignStudentsHandler);

  return router;
};

module.exports = routes;
