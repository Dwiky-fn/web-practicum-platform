const autoBind = require('auto-bind');

class StudentProgressHandler {
  constructor(service, jobsheetProgressService) {
    this._service = service;
    this._jobsheetProgressService = jobsheetProgressService;
    autoBind(this);
  }

  async getProgressHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { classId, studentId } = req.query;

      if (!studentId) {
        return res.status(400).json({
          status: 'fail',
          message: 'studentId wajib diisi',
        });
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
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: 'fail', message: 'Gagal mengambil progress' });
    }
  }

  async upsertProgressHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { studentId, classId, progress, lastPage, status, completedItems } = req.body;

      if (!studentId) {
        return res.status(400).json({
          status: 'fail',
          message: 'studentId wajib diisi',
        });
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
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: 'fail', message: 'Gagal menyimpan progress' });
    }
  }

  async updateJobsheetProgressHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { studentId, classId, experimentId, instructionId, activityType, metadata } = req.body;

      if (!studentId) {
        return res.status(400).json({
          status: 'fail',
          message: 'studentId wajib diisi',
        });
      }

      if (!activityType) {
        return res.status(400).json({
          status: 'fail',
          message: 'activityType wajib diisi',
        });
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
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: 'fail', message: 'Gagal memperbarui progress/aktivitas' });
    }
  }
}

module.exports = StudentProgressHandler;
