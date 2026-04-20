const SubmissionsHandler = require('./handler');
const routes = require('./routes');
const SubmissionsService = require('../../services/postgres/SubmissionsService');

module.exports = (app) => {
  const service = new SubmissionsService();
  const handler = new SubmissionsHandler(service);

  app.use(routes(handler));
};
