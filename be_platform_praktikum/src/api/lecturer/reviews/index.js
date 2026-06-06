const routes = require('./routes');
const LecturerReviewsHandler = require('./handler');
const LecturerReviewsService = require('../../../services/postgres/lecturer/ReviewsService');

module.exports = (app) => {
  const service = new LecturerReviewsService();
  const handler = new LecturerReviewsHandler(service);

  app.use(routes(handler));
};
