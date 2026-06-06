const express = require('express');
const { requireSelfOrRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get(
    '/users/:userId/notifications',
    requireSelfOrRoles('ADMIN'),
    handler.getNotificationsHandler,
  );

  return router;
};

module.exports = routes;
