const DepartmentsService = require('../../services/postgres/DepartmentsService');
const DepartmentsHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new DepartmentsService();
  const handler = new DepartmentsHandler(service);
  app.use(routes(handler));
};
