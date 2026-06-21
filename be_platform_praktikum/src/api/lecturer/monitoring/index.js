const routes = require('./routes');
const LecturerMonitoringHandler = require('./handler');
const MonitoringService = require('../../../services/postgres/lecturer/MonitoringService');

module.exports = (app) => {
  const service = new MonitoringService();
  const handler = new LecturerMonitoringHandler(service);

  app.use(routes(handler));
};
