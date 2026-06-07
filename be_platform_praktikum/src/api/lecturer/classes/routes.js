const express = require('express');
const { requireAuth, requireRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get(
    '/lecturer/classes',
    requireAuth,
    requireRoles('DOSEN'),
    handler.getClassesHandler,
  );

  router.get(
    '/lecturer/classes/:id',
    requireAuth,
    requireRoles('DOSEN'),
    handler.getClassByIdHandler,
  );

  return router;
};

module.exports = routes;
