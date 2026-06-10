const express = require('express');
const { requireSelfOrRoles } = require('../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.post('/login', handler.loginHandler);
  router.post('/login/google', handler.googleLoginHandler);
  router.post('/password-reset/request-otp', handler.requestPasswordResetOtpHandler);
  router.post('/password-reset/verify-otp', handler.resetPasswordWithOtpHandler);

  router.post('/auth/forgot-password/request-otp', handler.requestPasswordResetOtpHandler);
  router.post('/auth/forgot-password/verify-otp', handler.verifyPasswordResetOtpHandler);
  router.post('/auth/forgot-password/reset-password', handler.resetForgottenPasswordHandler);

  router.get('/users/:id', requireSelfOrRoles('ADMIN', 'DOSEN'), handler.getUserByIdHandler);
  router.put('/users/:id', requireSelfOrRoles('ADMIN'), handler.updateUserByIdHandler);
  router.post(
    '/users/:id/verify-password',
    requireSelfOrRoles('ADMIN'),
    handler.verifyCurrentPasswordHandler,
  );
  
  router.post(
    '/users/:id/email/request-otp',
    requireSelfOrRoles('ADMIN'),
    handler.requestUpdateEmailOtpHandler,
  );
  router.patch(
    '/users/:id/email/verify-otp',
    requireSelfOrRoles('ADMIN'),
    handler.verifyUpdateEmailOtpHandler,
  );  

  router.patch('/users/me/password', handler.changeAuthenticatedUserPasswordHandler);
  router.patch('/users/:id/password', requireSelfOrRoles('ADMIN'), handler.updateUserPasswordHandler);
  router.post('/users/:id/avatar', requireSelfOrRoles('ADMIN'), handler.uploadUserAvatarHandler);
  router.delete('/users/:id', requireSelfOrRoles('ADMIN'), handler.deleteUserByIdHandler);

  return router;
};

module.exports = routes;
