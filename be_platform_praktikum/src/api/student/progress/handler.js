const autoBind = require('auto-bind');
const { InvariantError } = require('../../../exceptions');

class StudentProgressHandler {
  constructor(service, jobsheetProgressService) {
    this._service = service;
    this._jobsheetProgressService = jobsheetProgressService;
    autoBind(this);
  }

  async getProgressHandler(req, res, next) {
    try {
      const { jobsheetId } = req.params;
      const { classId, studentId } = req.query;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      const progress = await this._service.getProgress(
        studentId,
        jobsheetId,
        classId,
      );

      return res.json({
        status: 'success',
        data: { progress },
      });
    } catch (error) {
      return next(error);
    }
  }

  async upsertProgressHandler(req, res, next) {
    try {
      const { jobsheetId } = req.params;
      const { studentId, classId, progress, lastPage, status, completedItems } = req.body;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      const result = await this._service.upsertProgress({
        studentId,
        jobsheetId,
        classId,
        progress,
        lastPage,
        status,
        completedItems,
      });

      return res.json({
        status: 'success',
        data: { progress: result },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateJobsheetProgressHandler(req, res, next) {
    try {
      const { jobsheetId } = req.params;
      const { studentId, classId, experimentId, instructionId, activityType, metadata } = req.body;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      if (!activityType) {
        throw new InvariantError('activityType wajib diisi');
      }

      const result = await this._jobsheetProgressService.updateProgress({
        studentId,
        jobsheetId,
        classId,
        experimentId,
        instructionId,
        activityType,
        metadata,
      });

      return res.json({
        status: 'success',
        data: { progress: result },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = StudentProgressHandler;
