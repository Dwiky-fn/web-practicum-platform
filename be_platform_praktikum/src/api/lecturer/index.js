const jobsheets = require('./jobsheets');
const reviews = require('./reviews');
const classes = require('./classes');

module.exports = (app) => {
  classes(app);
  jobsheets(app);
  reviews(app);
};
