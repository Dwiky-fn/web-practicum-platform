const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/users/:id', handler.getUserByIdHandler);
  router.put('/users/:id', handler.updateUserByIdHandler);
  router.post('/users/:id/avatar', handler.uploadUserAvatarHandler);
  router.delete('/users/:id', handler.deleteUserByIdHandler);

  return router;
};

module.exports = routes;
