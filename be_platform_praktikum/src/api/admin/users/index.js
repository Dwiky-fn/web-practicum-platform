const AdminUsersService = require('../../../services/postgres/admin/UsersService');
const AdminUsersHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new AdminUsersService();
  const handler = new AdminUsersHandler(service);

  app.use(routes(handler));
};
