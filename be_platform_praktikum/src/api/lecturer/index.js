const jobsheets = require('./jobsheets');
const reviews = require('./reviews');
const classes = require('./classes');
const progress = require('./progress');

module.exports = (app) => {
  classes(app);
  jobsheets(app);
  reviews(app);
  progress(app);
};
