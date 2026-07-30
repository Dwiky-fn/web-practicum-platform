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
      const classItem = await this._service.getClassDetail(req.params.id, req.query);

      const canAccess = await this._service.canAccessKelasPraktikum(req.params.id, req.user.id);
      if (!canAccess) {
        throw new AuthorizationError('Anda tidak memiliki akses ke kelas praktikum ini.');
      }

      return ok(res, { class: classItem });
    } catch (error) {
      if (error.message === 'CLASS_NOT_FOUND') {
        return next(new NotFoundError('Kelas tidak ditemukan'));
      }

      return next(error);
    }
  }

  async updateClassPlanHandler(req, res, next) {
    try {
      const canAccess = await this._service.canAccessKelasPraktikum(req.params.id, req.user.id);
      if (!canAccess) {
        throw new AuthorizationError('Anda tidak memiliki akses ke kelas praktikum ini.');
      }

      const planCount = req.body.jumlah_jobsheet_rencana || req.body.jumlahJobsheetRencana;
      const result = await this._service.updateClassPlan(req.params.id, planCount);
      return ok(res, { plan: result });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = LecturerClassesHandler;
