const routes = require('./routes');
const SubmissionsHandler = require('./handler');
const SubmissionsService = require('../../../services/postgres/student/SubmissionsService');
const JobsheetsService = require('../../../services/postgres/student/JobsheetsService');

module.exports = (app) => {
  const jobsheetService = new JobsheetsService();

  const service = new SubmissionsService(jobsheetService);
  const handler = new SubmissionsHandler(service);

  app.use(routes(handler));
};
