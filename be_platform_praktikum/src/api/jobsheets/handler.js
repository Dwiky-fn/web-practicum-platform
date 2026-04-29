const autoBind = require('auto-bind');

class JobsheetsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getJobsheetFullHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { courseId } = req.params;

      const jobsheet = await this._service.getJobsheetFullById(
        jobsheetId,
        courseId,
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
