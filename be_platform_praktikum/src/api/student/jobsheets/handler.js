const autoBind = require('auto-bind');
const { NotFoundError } = require('../../../exceptions');

class JobsheetsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getJobsheetsByCourseHandler(req, res, next) {
    try {
      const { courseId } = req.params;
      const jobsheets = await this._service.getJobsheetsByCourse(
        courseId,
        req.query.classId,
        req.user,
      );

      return res.json({
        status: 'success',
        data: { jobsheets },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getJobsheetFullHandler(req, res, next) {
    try {
      const { jobsheetId } = req.params;
      const { courseId } = req.params;

      const jobsheet = await this._service.getJobsheetFullById(
        jobsheetId,
        courseId,
        req.query.classId,
        req.user,
      );

      return res.json({
        status: 'success',
        data: { jobsheet },
      });
    } catch (error) {
      return next(new NotFoundError(error.message));
    }
  }
}

module.exports = JobsheetsHandler;
