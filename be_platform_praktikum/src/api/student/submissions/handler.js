const autoBind = require('auto-bind');

class SubmissionsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  _getStudentId(req) {
    return req.query?.studentId || req.body?.studentId;
  }

  _requireStudentId(req, res) {
    const studentId = this._getStudentId(req);

    if (!studentId) {
      res.status(400).json({
        status: 'fail',
        message: 'studentId wajib diisi',
      });
      return null;
    }

    return studentId;
  }

  _filterSubmissionForStudent(submission, userRole) {
    if (!submission) return null;

    const result = { ...submission };

    if (userRole === 'MAHASISWA') {
      if (result.review) {
        if (result.review.decision === 'PENDING') {
          // Sembunyikan review jika masih draft (PENDING)
          result.review = null;
        } else {
          // Hapus ai_feedback agar tidak membocorkan metadata AI ke mahasiswa
          const cleanReview = { ...result.review };
          delete cleanReview.ai_feedback;
          result.review = cleanReview;
        }
      }
    }

    return result;
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
    const studentId = this._requireStudentId(req, res);
    if (!studentId) return;

    const submission = await this._service.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
    );

    const filtered = this._filterSubmissionForStudent(submission, req.user?.role);

    return res.json({
      status: 'success',
      data: { submission: filtered },
    });
  }

  async getOrCreateSubmissionHandler(req, res) {
    const { jobsheetId, courseId } = req.params;
    const studentId = this._requireStudentId(req, res);
    if (!studentId) return;

    const submission = await this._service.getOrCreateSubmission(
      jobsheetId,
      courseId,
      studentId,
    );

    const filtered = this._filterSubmissionForStudent(submission, req.user?.role);

    return res.json({
      status: 'success',
      data: { submission: filtered },
    });
  }

  async putSubmissionHandler(req, res) {
    const { jobsheetId } = req.params;
    const studentId = this._requireStudentId(req, res);
    if (!studentId) return;
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
      const studentId = this._requireStudentId(req, res);
      if (!studentId) return;

      const submission = await this._service.submitSubmission(
        jobsheetId,
        studentId,
      );

      const filtered = this._filterSubmissionForStudent(submission, req.user?.role);

      return res.json({ status: 'success', data: { submission: filtered } });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ status: 'fail', message: 'Terjadi kesalahan saat submit' });
    }
  }
}

module.exports = SubmissionsHandler;
