const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/users', handler.getUsersHandler);
  router.get('/admin/users/:id', handler.getUserByIdHandler);
  router.post('/admin/users/students', handler.createStudentHandler);
  router.post('/admin/users/lecturers', handler.createLecturerHandler);

  return router;
};

module.exports = routes;
