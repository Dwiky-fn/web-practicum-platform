const dashboard = require('./dashboard');
const users = require('./users');
const academic = require('./academic');
const academicData = require('./academic-data');
const classes = require('./classes');

module.exports = (app) => {
  dashboard(app);
  users(app);
  academic(app);
  academicData(app);
  classes(app);
};
