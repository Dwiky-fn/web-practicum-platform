const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');

class ClassesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassesHandler(req, res) {
    try {
      return ok(res, { classes: await this._service.getClasses(req.query) });
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
      return ok(res, { class: classItem });
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
