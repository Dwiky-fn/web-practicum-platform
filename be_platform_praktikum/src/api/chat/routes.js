const express = require('express');

const routes = (handler) => {
  const router = express.Router();

  router.post('/conversations', handler.postConversationHandler);
  router.get('/conversations', handler.getLecturerConversationsHandler);
  router.get('/eligible-students', handler.getEligibleStudentsHandler);
  router.get('/lecturer/classes', handler.getLecturerClassesHandler);
  router.get('/lecturer/jobsheets', handler.getLecturerJobsheetsHandler);
  router.get('/lecturer/students', handler.getLecturerStudentsHandler);
  router.get('/conversations/:id/messages', handler.getMessagesHandler);
  router.post('/conversations/:id/messages', handler.postMessageHandler);
  router.patch('/conversations/:id/read', handler.patchReadHandler);
  router.get('/unread-count', handler.getUnreadCountHandler);

  return router;
};

module.exports = routes;
