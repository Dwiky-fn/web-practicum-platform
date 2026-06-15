const autoBind = require('auto-bind');

class DepartmentsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getDepartmentsHandler(req, res, next) {
    try {
      const departments = await this._service.getDepartments();
      return res.status(200).json({
        status: 'success',
        data: { departments },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = DepartmentsHandler;
