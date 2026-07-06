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
      const { classId, studentId, kelasPraktikumId, id_kelas_praktikum, attemptType, remedialId } = req.query;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      const resolvedKelasPraktikumId = kelasPraktikumId || id_kelas_praktikum || classId;
      if (!resolvedKelasPraktikumId) {
        throw new InvariantError('Konteks kelas praktikum tidak valid.');
      }

      const progress = await this._service.getProgress(
        studentId,
        jobsheetId,
        resolvedKelasPraktikumId,
        attemptType || null,
        remedialId || null,
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
      const { studentId, classId, kelasPraktikumId, id_kelas_praktikum, progress, lastPage, status, completedItems, attemptType, remedialId } = req.body;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      const resolvedKelasPraktikumId = kelasPraktikumId || id_kelas_praktikum || classId;
      if (!resolvedKelasPraktikumId) {
        throw new InvariantError('Konteks kelas praktikum tidak valid.');
      }

      const result = await this._service.upsertProgress({
        studentId,
        jobsheetId,
        kelasPraktikumId: resolvedKelasPraktikumId,
        progress,
        lastPage,
        status,
        completedItems,
        attemptType: attemptType || null,
        remedialId: remedialId || null,
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
      const { studentId, classId, kelasPraktikumId, id_kelas_praktikum, moduleId, experimentId, instructionId, activityType, metadata, attemptType, remedialId } = req.body;

      if (!studentId) {
        throw new InvariantError('studentId wajib diisi');
      }

      if (!activityType) {
        throw new InvariantError('activityType wajib diisi');
      }

      const resolvedKelasPraktikumId = kelasPraktikumId || id_kelas_praktikum || classId;
      if (!resolvedKelasPraktikumId) {
        throw new InvariantError('Konteks kelas praktikum tidak valid.');
      }

      const result = await this._jobsheetProgressService.updateProgress({
        studentId,
        jobsheetId,
        kelasPraktikumId: resolvedKelasPraktikumId,
        moduleId,
        experimentId,
        instructionId,
        activityType,
        metadata,
        attemptType: attemptType || null,
        remedialId: remedialId || null,
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
