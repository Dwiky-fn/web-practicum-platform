const routes = require('./routes');
const SubmissionsHandler = require('./handler');
const SubmissionsService = require('../../services/postgres/SubmissionsService');
const JobsheetsService = require('../../services/postgres/JobsheetsService');

module.exports = (app) => {
  const jobsheetService = new JobsheetsService();

  const service = new SubmissionsService(jobsheetService);
  const handler = new SubmissionsHandler(service);

  app.use(routes(handler));
};
