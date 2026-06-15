const autoBind = require('auto-bind');
const { InvariantError } = require('../../../exceptions');
const SubmissionsValidator = require('../../../validator/submissions');

class SubmissionsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  _getStudentId(req) {
    return req.query?.studentId || req.body?.studentId;
  }

  _requireStudentId(req) {
    const studentId = this._getStudentId(req);

    if (!studentId) {
      throw new InvariantError('studentId wajib diisi');
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
          // Bersihkan ai_feedback dari indikator AI sebelum dikirim ke mahasiswa
          const cleanReview = { ...result.review };
          delete cleanReview.ai_score;
          if (cleanReview.ai_feedback) {
            const cleanAiFeedback = { ...cleanReview.ai_feedback };
            if (Array.isArray(cleanAiFeedback.feedbacks)) {
              cleanAiFeedback.feedbacks = cleanAiFeedback.feedbacks.map((f) => ({
                ...f,
                source: 'lecturer', // Ubah semua source menjadi lecturer (Dosen)
              }));
            }
            if (Array.isArray(cleanAiFeedback.experimentResults)) {
              cleanAiFeedback.experimentResults = cleanAiFeedback.experimentResults.map((r) => ({
                ...r,
                source: 'lecturer',
              }));
            }
            if (Array.isArray(cleanAiFeedback.codeFeedbacks)) {
              cleanAiFeedback.codeFeedbacks = cleanAiFeedback.codeFeedbacks.map((fb) => ({
                ...fb,
                source: 'lecturer',
              }));
            }
            cleanReview.ai_feedback = cleanAiFeedback;
          }
          result.review = cleanReview;
        }
      }
    }

    return result;
  }

  async postSubmissionHandler(req, res, next) {
    try {
      const payload = req.body;

      const submission = await this._service.createSubmission(payload);

      return res.status(201).json({
        status: 'success',
        data: { submission },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getSubmissionHandler(req, res) {
    const { jobsheetId } = req.params;
    const studentId = this._requireStudentId(req);

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
    const studentId = this._requireStudentId(req);

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
    const { jobsheetId, courseId } = req.params;
    const studentId = this._requireStudentId(req);

    if (req.body.experimentId !== undefined || req.body.instructionId !== undefined) {
      const stepPayload = SubmissionsValidator.validateStepPayload(req.body);

      try {
        const submission = await this._service.updateSubmissionStep({
          jobsheetId,
          studentId,
          courseId,
          stepPayload,
        });

        return res.json({
          status: 'success',
          data: { submission },
        });
      } catch (error) {
        if (error.statusCode) {
          throw error;
        }

        throw new InvariantError(error.message || 'Gagal memperbarui step submission');
      }
    }

    const { report, status } = req.body;

    try {
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
    } catch (error) {
      throw error;
    }
  }

  async submitSubmissionHandler(req, res) {
    const { jobsheetId } = req.params;
    const studentId = this._requireStudentId(req);

    const submission = await this._service.submitSubmission(
      jobsheetId,
      studentId,
    );

    const filtered = this._filterSubmissionForStudent(submission, req.user?.role);

    return res.json({ status: 'success', data: { submission: filtered } });
  }
}

module.exports = SubmissionsHandler;
