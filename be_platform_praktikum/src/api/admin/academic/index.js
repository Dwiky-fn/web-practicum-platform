const AcademicService = require('../../../services/postgres/admin/AcademicService');
const AcademicHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new AcademicService();
  const handler = new AcademicHandler(service);

  app.use(routes(handler));
};
