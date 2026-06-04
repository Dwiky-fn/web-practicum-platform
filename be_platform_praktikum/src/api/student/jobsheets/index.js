const JobsheetsHandler = require('./handler');
const routes = require('./routes');
const JobsheetsService = require('../../../services/postgres/student/JobsheetsService');

module.exports = (app) => {
  const service = new JobsheetsService();
  const handler = new JobsheetsHandler(service);

  app.use(routes(handler));
};
