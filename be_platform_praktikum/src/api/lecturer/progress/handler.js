const autoBind = require('auto-bind');

class LecturerProgressHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassProgressHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { classId } = req.query;

      if (!classId) {
        return res.status(400).json({
          status: 'fail',
          message: 'classId wajib disertakan sebagai query parameter',
        });
      }

      const result = await this._service.getClassProgress(jobsheetId, classId);

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: 'fail',
        message: 'Gagal memuat monitoring progress kelas',
      });
    }
  }

  async getStudentDetailProgressHandler(req, res) {
    try {
      const { jobsheetId, studentId } = req.params;
      const { classId } = req.query;

      const result = await this._service.getStudentDetailProgress(jobsheetId, studentId, classId);

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: 'fail',
        message: 'Gagal memuat detail progress mahasiswa',
      });
    }
  }
}

module.exports = LecturerProgressHandler;
