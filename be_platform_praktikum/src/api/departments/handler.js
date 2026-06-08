const autoBind = require('auto-bind');

class DepartmentsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getDepartmentsHandler(req, res) {
    try {
      const departments = await this._service.getDepartments();
      return res.status(200).json({
        status: 'success',
        data: { departments },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }
}

module.exports = DepartmentsHandler;
