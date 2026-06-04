const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/users/:userId/activities', handler.getRecentActivitiesHandler);

  return router;
};

module.exports = routes;
