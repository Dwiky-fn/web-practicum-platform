const autoBind = require('auto-bind');
const { InvariantError } = require('../../../exceptions');
const { ok, handleAdminError } = require('../../admin/utils');

class LecturerReviewsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async putSubmissionReviewHandler(req, res) {
    try {
      const review = await this._service.saveSubmissionReview(req.body, req.user.id);
      return ok(res, { review }, 'Review submission berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postTriggerAiHandler(req, res) {
    try {
      const { submissionId } = req.params;

      await this._service.ensureSubmissionAccess(submissionId, req.user.id);
      const AiEvaluationQueue = require('../../../services/execution/AiEvaluationQueue');
      const result = await AiEvaluationQueue.addJob(submissionId, { force: true });
      if (!result.enqueued) {
        throw new InvariantError(`Gagal menambahkan ke antrean: ${result.reason}`);
      }
      return ok(res, {}, 'Evaluasi AI berhasil ditambahkan ke antrean');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postRetryAiHandler(req, res) {
    try {
      const { submissionId } = req.params;

      await this._service.ensureSubmissionAccess(submissionId, req.user.id);
      const AiEvaluationQueue = require('../../../services/execution/AiEvaluationQueue');
      const result = await AiEvaluationQueue.addJob(submissionId, { force: true });
      if (!result.enqueued) {
        throw new InvariantError(`Gagal memasukkan ke antrean: ${result.reason}`);
      }
      return ok(res, {}, 'Evaluasi AI berhasil dimasukkan ulang ke antrean');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteAiFeedbackHandler(req, res) {
    try {
      const { submissionId } = req.params;
      const result = await this._service.deleteAiFeedbackForSubmission(submissionId, req.user.id);

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
