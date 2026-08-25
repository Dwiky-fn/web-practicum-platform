const autoBind = require('auto-bind');

class LecturerMonitoringHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getMonitoringHandler(req, res, next) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.params;
      const data = await this._service.getMonitoring({
        kelasPraktikumId,
        jobsheetId,
        lecturerId: req.user.id,
        query: req.query,
      });

      return res.json({ status: 'success', data });
    } catch (error) {
      return next(error);
    }
  }

  async getClassMonitoringHandler(req, res, next) {
    try {
      const { kelasPraktikumId } = req.params;
      const data = await this._service.getClassMonitoring({
        kelasPraktikumId,
        lecturerId: req.user.id,
      });

      return res.json({ status: 'success', data });
    } catch (error) {
      return next(error);
    }
  }

  async getLocationDetailHandler(req, res, next) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.params;
      const data = await this._service.getLocationDetail({
        kelasPraktikumId,
        jobsheetId,
        lecturerId: req.user.id,
        query: req.query,
      });

      return res.json({ status: 'success', data });
    } catch (error) {
      return next(error);
    }
  }

  async getStudentWorkpageHandler(req, res, next) {
    try {
      const { kelasPraktikumId, jobsheetId, studentId } = req.params;
      const data = await this._service.getStudentWorkpage({
        kelasPraktikumId,
        jobsheetId,
        studentId,
        lecturerId: req.user.id,
        query: req.query,
      });

      return res.json({ status: 'success', data });
    } catch (error) {
      return next(error);
    }
  }
  async getMonitoringEventsSseHandler(req, res, next) {
    try {
      const { kelasPraktikumId } = req.params;
      await this._service._assertLecturerAccess(kelasPraktikumId, req.user.id);
      const MonitoringSseHub = require('../../../services/monitoring/MonitoringSseHub');
      MonitoringSseHub.subscribe(kelasPraktikumId, res);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = LecturerMonitoringHandler;
