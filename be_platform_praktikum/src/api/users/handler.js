const autoBind = require('auto-bind');

class UsersHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getUserByIdHandler(req, res) {
    try {
      const { id } = req.params;

      const user = await this._service.getUserById(id);

      return res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }
}

module.exports = UsersHandler;
