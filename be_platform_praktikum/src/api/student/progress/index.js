const routes = require('./routes');
const StudentProgressService = require('../../../services/postgres/student/StudentProgressService');
const StudentJobsheetProgressService = require('../../../services/postgres/student/StudentJobsheetProgressService');
const StudentProgressHandler = require('./handler');

module.exports = (app) => {
  const service = new StudentProgressService();
  const jobsheetProgressService = new StudentJobsheetProgressService();
  const handler = new StudentProgressHandler(service, jobsheetProgressService);

  app.use(routes(handler));
};
