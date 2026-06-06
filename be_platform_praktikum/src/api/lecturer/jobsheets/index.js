const routes = require('./routes');
const LecturerJobsheetsHandler = require('./handler');
const LecturerJobsheetsService = require('../../../services/postgres/lecturer/JobsheetsService');

module.exports = (app) => {
  const service = new LecturerJobsheetsService();
  const handler = new LecturerJobsheetsHandler(service);

  app.use(routes(handler));
};
