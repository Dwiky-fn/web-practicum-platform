const autoBind = require('auto-bind');
const { ok } = require('../../admin/utils');

class LecturerClassesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassesHandler(req, res) {
    try {
      const classes = await this._service.getClasses({
        ...req.query,
        lecturerId: req.user.id,
      });

      return ok(res, { classes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal memuat kelas dosen',
      });
    }
  }

  async getClassByIdHandler(req, res) {
    try {
      const classItem = await this._service.getClassDetail(req.params.id);

      if (classItem.lecturerId !== req.user.id) {
        return res.status(403).json({
          status: 'fail',
          message: 'Dosen hanya dapat mengakses kelas yang diampu',
        });
      }

      return ok(res, { class: classItem });
    } catch (error) {
      if (error.message === 'CLASS_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'Kelas tidak ditemukan',
        });
      }

      console.error(error);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal memuat detail kelas dosen',
      });
    }
  }
}

module.exports = LecturerClassesHandler;
