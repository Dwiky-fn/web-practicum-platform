const express = require('express');

module.exports = (handler) => {
  const router = express.Router();
  
  router.get('/student-progress/:jobsheetId', handler.getProgressHandler);
  router.put('/student-progress/:jobsheetId', handler.upsertProgressHandler);

  return router;
};
