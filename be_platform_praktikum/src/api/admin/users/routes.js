const express = require('express');
const { requireRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.use('/admin/users', requireRoles('ADMIN'));

  router.get('/admin/users', handler.getUsersHandler);
  router.get('/admin/users/:id', handler.getUserByIdHandler);
  router.put('/admin/users/:id', handler.updateUserHandler);
  router.post('/admin/users/students', handler.createStudentHandler);
  router.post('/admin/users/lecturers', handler.createLecturerHandler);
  router.post('/admin/users/:id/activate', handler.activateUserHandler);
  router.post('/admin/users/:id/deactivate', handler.deactivateUserHandler);
  router.delete('/admin/users/:id', handler.deleteUserHandler);

  return router;
};

module.exports = routes;
