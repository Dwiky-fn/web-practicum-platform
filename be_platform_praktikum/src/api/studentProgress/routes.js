const express = require('express');

module.exports = (handler) => {
  const router = express.Router();
  
  router.get('/:jobsheetId/progress', handler.getProgressHandler);
  router.put('/:jobsheetId/progress', handler.upsertProgressHandler);

  return router;
};
