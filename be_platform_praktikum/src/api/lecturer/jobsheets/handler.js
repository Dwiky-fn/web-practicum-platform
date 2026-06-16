const autoBind = require('auto-bind');
const { created, ok, handleAdminError } = require('../../admin/utils');
const LecturerJobsheetsValidator = require('../../../validator/lecturer/jobsheets');

class LecturerJobsheetsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async postJobsheetHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { courseId } = req.params;
      const result = await this._service.createJobsheet(
        courseId,
        payload.lecturerId,
        payload,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postJobsheetByMataKuliahHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { mataKuliahId } = req.params;
      const result = await this._service.createJobsheetByMataKuliah(
        mataKuliahId,
        payload.lecturerId,
        payload,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { courseId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheet(
        courseId,
        jobsheetId,
        payload.lecturerId,
        payload,
      );

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetByMataKuliahHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { mataKuliahId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheetByMataKuliah(
        mataKuliahId,
        jobsheetId,
        payload.lecturerId,
        payload,
      );

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async publishJobsheetHandler(req, res) {
    try {
      const { courseId, jobsheetId } = req.params;
      const result = await this._service.publishJobsheet(
        courseId,
        jobsheetId,
        req.body.lecturerId,
        req.body,
      );

      return ok(res, { jobsheet: result }, 'Pengaturan publikasi jobsheet berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async publishJobsheetByMataKuliahHandler(req, res) {
    try {
      const { mataKuliahId, jobsheetId } = req.params;
      const result = await this._service.publishJobsheetByMataKuliah(
        mataKuliahId,
        jobsheetId,
        req.body.lecturerId,
        req.body,
      );

      return ok(res, { jobsheet: result }, 'Pengaturan publikasi jobsheet berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = LecturerJobsheetsHandler;
