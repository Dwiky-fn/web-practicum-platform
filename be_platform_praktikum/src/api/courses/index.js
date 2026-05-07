const routes = require('./routes');
const CoursesService = require('../../services/postgres/CoursesService');
const CoursesHandler = require('./handler');

module.exports = (app) => {
  const service = new CoursesService();

  const handler = new CoursesHandler(service);

  app.use(routes(handler));
};
