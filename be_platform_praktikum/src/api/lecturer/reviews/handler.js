const autoBind = require('auto-bind');
const { ok, handleAdminError } = require('../../admin/utils');
const pool = require('../../../services/postgres');

class LecturerReviewsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async putSubmissionReviewHandler(req, res) {
    try {
      const review = await this._service.saveSubmissionReview(req.body);
      return ok(res, { review }, 'Review submission berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postTriggerAiHandler(req, res) {
    try {
      const { submissionId } = req.params;

      const AiEvaluationQueue = require('../../../services/execution/AiEvaluationQueue');
      const result = await AiEvaluationQueue.addJob(submissionId, { force: true });
      if (!result.enqueued) {
        return res.status(400).json({
          status: 'fail',
          message: `Gagal menambahkan ke antrean: ${result.reason}`,
        });
      }
      return ok(res, {}, 'Evaluasi AI berhasil ditambahkan ke antrean');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postRetryAiHandler(req, res) {
    try {
      const { submissionId } = req.params;

      const AiEvaluationQueue = require('../../../services/execution/AiEvaluationQueue');
      const result = await AiEvaluationQueue.addJob(submissionId, { force: true });
      if (!result.enqueued) {
        return res.status(400).json({
          status: 'fail',
          message: `Gagal memasukkan ke antrean: ${result.reason}`,
        });
      }
      return ok(res, {}, 'Evaluasi AI berhasil dimasukkan ulang ke antrean');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteAiFeedbackHandler(req, res) {
    try {
      const { submissionId } = req.params;
      const result = await this._service.deleteAiFeedbackForSubmission(submissionId);

      return ok(
        res,
        result,
        'Feedback AI berhasil dihapus dari review submission',
      );
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = LecturerReviewsHandler;
