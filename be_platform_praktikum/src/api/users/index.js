const routes = require('./routes');
const UsersService = require('../../services/postgres/UsersService');
const CloudinaryService = require('../../services/cloudinary/CloudinaryService');
const UsersHandler = require('./handler');

module.exports = (app) => {
  const service = new UsersService();
  const cloudinaryService = new CloudinaryService();
  const handler = new UsersHandler(service, cloudinaryService);

  app.use(routes(handler));
};
