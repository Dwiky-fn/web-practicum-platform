const autoBind = require('auto-bind');

class StudentProgressHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getProgressHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { classId } = req.query;
      const studentId = req.user?.id || 'mhs-1'; // ganti sesuai auth kamu

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
      const studentId = req.user?.id || 'mhs-1';
      const { classId, progress, lastPage, status } = req.body;

      const result = await this._service.upsertProgress({
        studentId,
        jobsheetId,
        classId,
        progress,
        lastPage,
        status,
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
}

module.exports = StudentProgressHandler;
