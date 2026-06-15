const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');
const AcademicValidator = require('../../../validator/admin/academic');

class AcademicHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getSemestersHandler(req, res) {
    try {
      return ok(res, { semesters: await this._service.getSemesters() });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createSemesterHandler(req, res) {
    try {
      const payload = AcademicValidator.validateCreateSemesterPayload(req.body);
      const semester = await this._service.createSemester(payload);
      return created(res, { semester }, 'Semester berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async advanceSemesterHandler(req, res) {
    try {
      const result = await this._service.advanceSemester();
      return ok(res, result, 'Semester berikutnya berhasil diaktifkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async activateSemesterHandler(req, res) {
    try {
      await this._service.activateSemester(req.params.id);
      return ok(res, {}, 'Semester berhasil diaktifkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteSemesterHandler(req, res) {
    try {
      await this._service.deleteSemester(req.params.id);
      return ok(res, {}, 'Semester berhasil dihapus');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getCoursesHandler(req, res) {
    try {
      const query = AcademicValidator.validateCoursesQuery(req.query);
      return ok(res, { courses: await this._service.getCourses(query) });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createCourseHandler(req, res) {
    try {
      const payload = AcademicValidator.validateCreateCoursePayload(req.body);
      const course = await this._service.createCourse(payload);
      return created(res, { course }, 'Mata kuliah berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async updateCourseHandler(req, res) {
    try {
      const payload = AcademicValidator.validateUpdateCoursePayload(req.body);
      const course = await this._service.updateCourse(req.params.id, payload);
      return ok(res, { course }, 'Mata kuliah berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async activateCourseHandler(req, res) {
    try {
      const course = await this._service.updateCourse(req.params.id, {
        status: 'Aktif',
      });
      return ok(res, { course }, 'Mata kuliah berhasil diaktifkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteCourseHandler(req, res) {
    try {
      await this._service.deleteCourse(req.params.id);
      return ok(res, {}, 'Mata kuliah berhasil dihapus');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = AcademicHandler;
