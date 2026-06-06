const express = require('express');
const { requireRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/dashboard', requireRoles('ADMIN'), handler.getDashboardHandler);

  return router;
};

module.exports = routes;
