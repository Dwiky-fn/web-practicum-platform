const autoBind = require('auto-bind');
const { handleAdminError, ok } = require('../utils');

class DashboardHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getDashboardHandler(req, res) {
    try {
      return ok(res, { dashboard: await this._service.getDashboard() });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = DashboardHandler;
