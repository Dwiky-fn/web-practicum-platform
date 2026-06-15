const autoBind = require('auto-bind');
const { AuthorizationError, NotFoundError } = require('../../../exceptions');
const { ok } = require('../../admin/utils');

class LecturerClassesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassesHandler(req, res, next) {
    try {
      const classes = await this._service.getClasses({
        ...req.query,
        lecturerId: req.user.id,
      });

      return ok(res, { classes });
    } catch (error) {
      return next(error);
    }
  }

  async getClassByIdHandler(req, res, next) {
    try {
      const classItem = await this._service.getClassDetail(req.params.id);

      if (classItem.lecturerId !== req.user.id) {
        throw new AuthorizationError('Dosen hanya dapat mengakses kelas yang diampu');
      }

      return ok(res, { class: classItem });
    } catch (error) {
      if (error.message === 'CLASS_NOT_FOUND') {
        return next(new NotFoundError('Kelas tidak ditemukan'));
      }

      return next(error);
    }
  }
}

module.exports = LecturerClassesHandler;
