const routes = require('./routes');
const StudentJobsheetProgressService = require('../../../services/postgres/student/StudentJobsheetProgressService');
const LecturerProgressHandler = require('./handler');

module.exports = (app) => {
  const service = new StudentJobsheetProgressService();
  const handler = new LecturerProgressHandler(service);

  app.use(routes(handler));
};
