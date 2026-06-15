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
      const { classId } = req.query;

      if (!classId) {
        throw new InvariantError('classId wajib disertakan sebagai query parameter');
      }

      const result = await this._service.getClassProgress(jobsheetId, classId);

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
      const { classId } = req.query;

      const result = await this._service.getStudentDetailProgress(jobsheetId, studentId, classId);

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
