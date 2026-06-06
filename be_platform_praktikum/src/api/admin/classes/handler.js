const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');

class ClassesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassesHandler(req, res) {
    try {
      const filters = {
        ...req.query,
        lecturerId: req.user.role === 'DOSEN' ? req.user.id : req.query.lecturerId,
      };

      return ok(res, { classes: await this._service.getClasses(filters) });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createClassHandler(req, res) {
    try {
      const classItem = await this._service.createClass(req.body);
      return created(res, { class: classItem }, 'Kelas berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getClassByIdHandler(req, res) {
    try {
      const classItem = await this._service.getClassDetail(req.params.id);

      if (req.user.role === 'DOSEN' && classItem.lecturerId !== req.user.id) {
        return res.status(403).json({
          status: 'fail',
          message: 'Anda hanya dapat mengakses kelas yang diampu',
        });
      }

      return ok(res, { class: classItem });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async updateClassHandler(req, res) {
    try {
      const classItem = await this._service.updateClass(req.params.id, req.body);
      return ok(res, { class: classItem }, 'Kelas berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteClassHandler(req, res) {
    try {
      await this._service.deleteClass(req.params.id);
      return ok(res, {}, 'Kelas berhasil dihapus');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getStudentCandidatesHandler(req, res) {
    try {
      const students = await this._service.getStudentCandidates(req.params.id, req.query);
      return ok(res, { students });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async assignStudentsHandler(req, res) {
    try {
      const students = await this._service.assignStudentsToClass(
        req.params.id,
        req.body.studentIds || [],
      );
      return ok(res, { students }, 'Mahasiswa berhasil di-assign');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = ClassesHandler;
