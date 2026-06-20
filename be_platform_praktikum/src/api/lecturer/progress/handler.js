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
      // Query param lama `classId` dipertahankan sebagai alias; nilainya adalah kelasPraktikumId native.
      const resolvedKelasPraktikumId = kelasPraktikumId || id_kelas_praktikum || classId;

      if (!resolvedKelasPraktikumId) {
        throw new InvariantError('kelasPraktikumId wajib disertakan sebagai query parameter');
      }

      const result = await this._service.getClassProgress(
        jobsheetId,
        resolvedKelasPraktikumId,
        req.user.id,
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
      // Query param lama `classId` dipertahankan sebagai alias; nilainya adalah kelasPraktikumId native.
      const resolvedKelasPraktikumId = kelasPraktikumId || id_kelas_praktikum || classId;
      if (!resolvedKelasPraktikumId) {
        throw new InvariantError('kelasPraktikumId wajib disertakan sebagai query parameter');
      }

      const result = await this._service.getStudentDetailProgress(
        jobsheetId,
        studentId,
        resolvedKelasPraktikumId,
        req.user.id,
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
