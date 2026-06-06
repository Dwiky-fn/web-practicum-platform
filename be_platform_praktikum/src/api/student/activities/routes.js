const express = require('express');
const { requireSelfOrRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get(
    '/users/:userId/activities',
    requireSelfOrRoles('ADMIN'),
    handler.getRecentActivitiesHandler,
  );

  return router;
};

module.exports = routes;
