const ClassesService = require('../../../services/postgres/admin/ClassesService');
const LecturerClassesHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new ClassesService();
  const handler = new LecturerClassesHandler(service);

  app.use(routes(handler));
};
