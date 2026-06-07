const express = require('express');
const { requireTargetUserOrRoles } = require('../../../middlewares/auth');

module.exports = (handler) => {
  const router = express.Router();
  
  router.get(
    '/student-progress/:jobsheetId',
    requireTargetUserOrRoles('studentId'),
    handler.getProgressHandler,
  );
  router.put(
    '/student-progress/:jobsheetId',
    requireTargetUserOrRoles('studentId'),
    handler.upsertProgressHandler,
  );
  router.post(
    '/student-progress/:jobsheetId/update',
    requireTargetUserOrRoles('studentId'),
    handler.updateJobsheetProgressHandler,
  );

  return router;
};
