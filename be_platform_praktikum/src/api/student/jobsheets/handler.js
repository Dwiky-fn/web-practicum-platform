const autoBind = require('auto-bind');

class JobsheetsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getJobsheetsByCourseHandler(req, res) {
    try {
      const { courseId } = req.params;
      const jobsheets = await this._service.getJobsheetsByCourse(courseId, req.query.classId);

      return res.json({
        status: 'success',
        data: { jobsheets },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  async getJobsheetFullHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { courseId } = req.params;

      const jobsheet = await this._service.getJobsheetFullById(
        jobsheetId,
        courseId,
        req.query.classId,
      );

      return res.json({
        status: 'success',
        data: { jobsheet },
      });
    } catch (error) {
      console.error(error);

      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}

module.exports = JobsheetsHandler;
