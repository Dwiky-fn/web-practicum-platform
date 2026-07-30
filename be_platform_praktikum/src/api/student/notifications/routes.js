const express = require('express');
const { requireSelfOrRoles } = require('../../../middlewares/auth');

const routes = (handler) => {
  const router = express.Router();

  router.get(
    '/users/:userId/notifications',
    requireSelfOrRoles('ADMIN', 'DOSEN', 'MAHASISWA'),
    handler.getNotificationsHandler,
  );

  router.patch(
    '/users/:userId/notifications/read',
    requireSelfOrRoles('ADMIN', 'DOSEN', 'MAHASISWA'),
    handler.markNotificationsAsReadHandler,
  );

  return router;
};

module.exports = routes;
