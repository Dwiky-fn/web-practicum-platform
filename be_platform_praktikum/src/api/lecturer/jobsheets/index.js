const routes = require('./routes');
const LecturerJobsheetsHandler = require('./handler');
const LecturerJobsheetsService = require('../../../services/postgres/lecturer/JobsheetsService');
const RemedialsService = require('../../../services/postgres/lecturer/RemedialsService');
const StudentJobsheetsService = require('../../../services/postgres/student/JobsheetsService');
const CloudinaryService = require('../../../services/cloudinary/CloudinaryService');

module.exports = (app) => {
  const service = new LecturerJobsheetsService();
  const studentJobsheetsService = new StudentJobsheetsService();
  const remedialsService = new RemedialsService(studentJobsheetsService);
  const cloudinaryService = new CloudinaryService();
  const handler = new LecturerJobsheetsHandler(service, remedialsService, cloudinaryService);

  app.use(routes(handler));
};
