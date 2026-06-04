const DashboardService = require('../../../services/postgres/admin/DashboardService');
const DashboardHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new DashboardService();
  const handler = new DashboardHandler(service);

  app.use(routes(handler));
};
