const jobsheets = require('./jobsheets');
const reviews = require('./reviews');
const classes = require('./classes');
const progress = require('./progress');
const monitoring = require('./monitoring');

module.exports = (app) => {
  classes(app);
  jobsheets(app);
  monitoring(app);
  reviews(app);
  progress(app);
};
