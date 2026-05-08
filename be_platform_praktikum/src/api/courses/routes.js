const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/courses', handler.getAllCoursesHandler);

  router.get('/students/:studentId/courses', handler.getCoursesByStudentIdHandler);

  router.get('/courses/:id', handler.getCourseByIdHandler);

  return router;
};

module.exports = routes;
