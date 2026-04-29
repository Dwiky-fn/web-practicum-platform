const routes = require('./routes');
const UsersService = require('../../services/postgres/UsersService');
const UsersHandler = require('./handler');

module.exports = (app) => {
  const service = new UsersService();
  const handler = new UsersHandler(service);

  app.use(routes(handler));
};
