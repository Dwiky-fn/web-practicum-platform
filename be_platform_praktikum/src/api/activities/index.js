const routes = require('./routes');
const ActivitiesHandler = require('./handler');
const ActivitiesService = require('../../services/postgres/ActivitiesService');

module.exports = (app) => {
  const service = new ActivitiesService();
  const handler = new ActivitiesHandler(service);

  app.use(routes(handler));
};
