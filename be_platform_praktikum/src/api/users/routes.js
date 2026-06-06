const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/login', handler.loginHandler);
  router.post('/login/google', handler.googleLoginHandler);

  router.get('/users/:id', handler.getUserByIdHandler);
  router.put('/users/:id', handler.updateUserByIdHandler);
  router.post('/users/:id/verify-password', handler.verifyCurrentPasswordHandler);
  
  router.post(
    '/users/:id/email/request-otp',
    handler.requestUpdateEmailOtpHandler,
  );
  router.patch(
    '/users/:id/email/verify-otp',
    handler.verifyUpdateEmailOtpHandler,
  );  

  router.patch('/users/:id/password', handler.updateUserPasswordHandler);
  router.post('/users/:id/avatar', handler.uploadUserAvatarHandler);
  router.delete('/users/:id', handler.deleteUserByIdHandler);

  return router;
};

module.exports = routes;
