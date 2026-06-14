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
      const validation = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);
      if (validation.error) {
        return res.status(400).json({
          status: 'fail',
          message: validation.error.details[0].message,
        });
      }

      const { courseId } = req.params;
      const result = await this._service.createJobsheet(
        courseId,
        req.body.lecturerId,
        req.body,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetHandler(req, res) {
    try {
      const validation = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);
      if (validation.error) {
        return res.status(400).json({
          status: 'fail',
          message: validation.error.details[0].message,
        });
      }

      const { courseId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheet(
        courseId,
        jobsheetId,
        req.body.lecturerId,
        req.body,
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
}

module.exports = LecturerJobsheetsHandler;
