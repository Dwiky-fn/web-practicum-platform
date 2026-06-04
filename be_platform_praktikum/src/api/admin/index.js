const dashboard = require('./dashboard');
const users = require('./users');
const academic = require('./academic');
const classes = require('./classes');

module.exports = (app) => {
  dashboard(app);
  users(app);
  academic(app);
  classes(app);
};
