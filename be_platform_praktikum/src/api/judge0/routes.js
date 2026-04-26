const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/judge0/run', handler.runCodeHandler);

  return router;
};

module.exports = routes;
