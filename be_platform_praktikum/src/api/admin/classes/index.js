const ClassesService = require('../../../services/postgres/admin/ClassesService');
const ClassesHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new ClassesService();
  const handler = new ClassesHandler(service);

  app.use(routes(handler));
};
