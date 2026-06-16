const autoBind = require('auto-bind');
const { InvariantError } = require('../../../exceptions');

class LecturerProgressHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassProgressHandler(req, res, next) {
    try {
      const { jobsheetId } = req.params;
      const { classId, kelasPraktikumId, id_kelas_praktikum } = req.query;

      if (!classId && !kelasPraktikumId && !id_kelas_praktikum) {
        throw new InvariantError('classId atau kelasPraktikumId wajib disertakan sebagai query parameter');
      }

      const result = await this._service.getClassProgress(
        jobsheetId,
        classId,
        kelasPraktikumId || id_kelas_praktikum,
      );

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getStudentDetailProgressHandler(req, res, next) {
    try {
      const { jobsheetId, studentId } = req.params;
      const { classId, kelasPraktikumId, id_kelas_praktikum } = req.query;

      const result = await this._service.getStudentDetailProgress(
        jobsheetId,
        studentId,
        classId,
        kelasPraktikumId || id_kelas_praktikum,
      );

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = LecturerProgressHandler;
