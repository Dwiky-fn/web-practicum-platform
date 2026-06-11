const autoBind = require('auto-bind');
const { ok, handleAdminError } = require('../../admin/utils');

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
      await AiEvaluationQueue.addJob(submissionId);
      return ok(res, {}, 'Evaluasi AI berhasil ditambahkan ke antrean');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = LecturerReviewsHandler;
