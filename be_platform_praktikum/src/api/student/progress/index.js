const routes = require('./routes');
const StudentProgressService = require('../../../services/postgres/student/StudentProgressService');
const StudentProgressHandler = require('./handler');

module.exports = (app) => {
  const service = new StudentProgressService();
  const handler = new StudentProgressHandler(service);

  app.use(routes(handler));
};
