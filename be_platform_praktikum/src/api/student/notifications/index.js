const routes = require('./routes');
const NotificationsHandler = require('./handler');
const NotificationsService = require('../../../services/postgres/student/NotificationsService');

module.exports = (app) => {
  const service = new NotificationsService();
  const handler = new NotificationsHandler(service);

  app.use(routes(handler));
};
