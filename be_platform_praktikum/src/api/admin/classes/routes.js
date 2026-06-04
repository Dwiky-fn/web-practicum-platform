const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/academic/classes', handler.getClassesHandler);
  router.post('/admin/academic/classes', handler.createClassHandler);
  router.get('/admin/classes/:id', handler.getClassByIdHandler);
  router.get('/admin/classes/:id/student-candidates', handler.getStudentCandidatesHandler);
  router.post('/admin/classes/:id/students', handler.assignStudentsHandler);

  return router;
};

module.exports = routes;
