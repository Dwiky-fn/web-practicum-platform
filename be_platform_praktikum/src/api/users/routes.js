const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/login', handler.loginHandler);
  router.get('/users/:id', handler.getUserByIdHandler);
  router.put('/users/:id', handler.updateUserByIdHandler);
  router.patch('/users/:id/email', handler.updateUserEmailHandler);
  router.patch('/users/:id/password', handler.updateUserPasswordHandler);
  router.post('/users/:id/avatar', handler.uploadUserAvatarHandler);
  router.delete('/users/:id', handler.deleteUserByIdHandler);

  return router;
};

module.exports = routes;
