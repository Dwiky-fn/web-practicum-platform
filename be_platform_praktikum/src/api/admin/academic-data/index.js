const AcademicDataService = require('../../../services/postgres/admin/AcademicDataService');
const AcademicDataHandler = require('./handler');
const routes = require('./routes');

module.exports = (app) => {
  const service = new AcademicDataService();
  const handler = new AcademicDataHandler(service);

  app.use('/admin', routes(handler));
};
