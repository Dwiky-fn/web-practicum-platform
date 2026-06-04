const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/academic/semesters', handler.getSemestersHandler);
  router.post('/admin/academic/semesters', handler.createSemesterHandler);
  router.post('/admin/academic/semesters/:id/activate', handler.activateSemesterHandler);
  router.get('/admin/academic/courses', handler.getCoursesHandler);
  router.post('/admin/academic/courses', handler.createCourseHandler);
  router.put('/admin/academic/courses/:id', handler.updateCourseHandler);
  router.post('/admin/academic/courses/:id/activate', handler.activateCourseHandler);

  return router;
};

module.exports = routes;
