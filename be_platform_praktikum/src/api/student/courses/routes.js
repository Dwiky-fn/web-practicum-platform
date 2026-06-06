const express = require('express');
const { requireTargetUserOrRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get('/courses', handler.getAllCoursesHandler);

  router.get(
    '/students/:studentId/courses',
    requireTargetUserOrRoles('studentId', 'ADMIN'),
    handler.getCoursesByStudentIdHandler,
  );

  router.get('/courses/:id', handler.getCourseByIdHandler);

  return router;
};

module.exports = routes;
