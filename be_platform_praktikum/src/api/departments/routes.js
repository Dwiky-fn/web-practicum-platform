const express = require('express');

const routes = (handler) => {
  const router = express.Router();
  router.get('/departments', handler.getDepartmentsHandler);
  return router;
};

module.exports = routes;
