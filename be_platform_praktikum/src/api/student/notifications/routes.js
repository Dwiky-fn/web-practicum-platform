const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/users/:userId/notifications', handler.getNotificationsHandler);

  return router;
};

module.exports = routes;
