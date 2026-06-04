const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');

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
      const semester = await this._service.createSemester(req.body);
      return created(res, { semester }, 'Semester berhasil ditambahkan');
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

  async getCoursesHandler(req, res) {
    try {
      return ok(res, { courses: await this._service.getCourses(req.query) });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createCourseHandler(req, res) {
    try {
      const course = await this._service.createCourse(req.body);
      return created(res, { course }, 'Mata kuliah berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async updateCourseHandler(req, res) {
    try {
      const course = await this._service.updateCourse(req.params.id, req.body);
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
}

module.exports = AcademicHandler;
