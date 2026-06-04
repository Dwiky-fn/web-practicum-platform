const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.get('/admin/dashboard', handler.getDashboardHandler);

  return router;
};

module.exports = routes;
