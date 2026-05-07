const autoBind = require('auto-bind');

class SubmissionsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async postSubmissionHandler(req, res) {
    try {
      const payload = req.body;

      const submission = await this._service.createSubmission(payload);

      return res.status(201).json({
        status: 'success',
        data: { submission },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        status: 'fail',
        message: 'Terjadi kesalahan saat membuat submission',
      });
    }
  }

  async getSubmissionHandler(req, res) {
    const { jobsheetId } = req.params;
    const { courseId } = req.params;
    const studentId = req.user?.id || 'mhs-1';

    const submission = await this._service.getOrCreateSubmission(
      jobsheetId,
      courseId,
      studentId,
    );

    return res.json({
      status: 'success',
      data: { submission },
    });
  }

  async putSubmissionHandler(req, res) {
    const { jobsheetId } = req.params;
    const studentId = req.user?.id || 'mhs-1';
    const { report, status } = req.body;

    const submission = await this._service.updateSubmission({
      jobsheetId,
      studentId,
      report,
      status,
    });

    return res.json({
      status: 'success',
      data: { submission },
    });
  }

  async submitSubmissionHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const studentId = req.user?.id || 'mhs-1';

      const submission = await this._service.submitSubmission(
        jobsheetId,
        studentId,
      );

      return res.json({ status: 'success', data: { submission } });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ status: 'fail', message: 'Terjadi kesalahan saat submit' });
    }
  }
}

module.exports = SubmissionsHandler;
