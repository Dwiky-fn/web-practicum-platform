const jobsheets = require('./jobsheets');
const reviews = require('./reviews');

module.exports = (app) => {
  jobsheets(app);
  reviews(app);
};
