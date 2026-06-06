const express = require('express');
const { requireRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/academic/semesters', requireRoles('ADMIN'), handler.getSemestersHandler);
  router.post('/admin/academic/semesters', requireRoles('ADMIN'), handler.createSemesterHandler);
  router.post(
    '/admin/academic/semesters/:id/activate',
    requireRoles('ADMIN'),
    handler.activateSemesterHandler,
  );
  router.delete('/admin/academic/semesters/:id', requireRoles('ADMIN'), handler.deleteSemesterHandler);
  router.get('/admin/academic/courses', requireRoles('ADMIN'), handler.getCoursesHandler);
  router.post('/admin/academic/courses', requireRoles('ADMIN'), handler.createCourseHandler);
  router.put('/admin/academic/courses/:id', requireRoles('ADMIN'), handler.updateCourseHandler);
  router.post(
    '/admin/academic/courses/:id/activate',
    requireRoles('ADMIN'),
    handler.activateCourseHandler,
  );
  router.delete('/admin/academic/courses/:id', requireRoles('ADMIN'), handler.deleteCourseHandler);

  return router;
};

module.exports = routes;
