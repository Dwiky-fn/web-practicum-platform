const activities = require('./activities');
const courses = require('./courses');
const jobsheets = require('./jobsheets');
const notifications = require('./notifications');
const progress = require('./progress');
const submissions = require('./submissions');

module.exports = (app) => {
  courses(app);
  jobsheets(app);
  submissions(app);
  progress(app);
  activities(app);
  notifications(app);
};
