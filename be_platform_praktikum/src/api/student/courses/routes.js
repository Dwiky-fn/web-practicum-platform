const express = require('express');
const { requireTargetUserOrRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get('/courses', handler.getAllCoursesHandler);
  router.get('/mata-kuliah', handler.getAllCoursesHandler);

  router.get(
    '/students/:studentId/courses',
    requireTargetUserOrRoles('studentId', 'ADMIN'),
    handler.getCoursesByStudentIdHandler,
  );
  router.get(
    '/students/:studentId/mata-kuliah',
    requireTargetUserOrRoles('studentId', 'ADMIN'),
    handler.getCoursesByStudentIdHandler,
  );

  router.get('/courses/:id', handler.getCourseByIdHandler);
  router.get('/mata-kuliah/:id', handler.getCourseByIdHandler);

  return router;
};

module.exports = routes;
