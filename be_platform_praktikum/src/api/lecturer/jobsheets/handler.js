const autoBind = require('auto-bind');
const { created, ok, handleAdminError } = require('../../admin/utils');
const LecturerJobsheetsValidator = require('../../../validator/lecturer/jobsheets');

class LecturerJobsheetsHandler {
  constructor(service, remedialsService) {
    this._service = service;
    this._remedialsService = remedialsService;
    autoBind(this);
  }

  async postJobsheetHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { courseId } = req.params;
      const result = await this._service.createJobsheet(
        courseId,
        req.user.id,
        payload,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postJobsheetByMataKuliahHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { mataKuliahId } = req.params;
      const result = await this._service.createJobsheetByMataKuliah(
        mataKuliahId,
        req.user.id,
        payload,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postJobsheetByKelasPraktikumHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { kelasPraktikumId } = req.params;
      const result = await this._service.createJobsheetByKelasPraktikum(
        kelasPraktikumId,
        req.user.id,
        payload,
      );

      return created(res, { jobsheet: result }, 'Jobsheet berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { courseId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheet(
        courseId,
        jobsheetId,
        req.user.id,
        payload,
      );

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetByMataKuliahHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { mataKuliahId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheetByMataKuliah(
        mataKuliahId,
        jobsheetId,
        req.user.id,
        payload,
      );

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async putJobsheetByKelasPraktikumHandler(req, res) {
    try {
      const payload = LecturerJobsheetsValidator.validateJobsheetPayload(req.body);

      const { kelasPraktikumId, jobsheetId } = req.params;
      const result = await this._service.updateJobsheetByKelasPraktikum(
        kelasPraktikumId,
        jobsheetId,
        req.user.id,
        payload,
      );

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async publishJobsheetHandler(req, res) {
    try {
      const { courseId, jobsheetId } = req.params;
      const result = await this._service.publishJobsheet(
        courseId,
        jobsheetId,
        req.user.id,
        req.body,
      );

      return ok(res, { jobsheet: result }, 'Pengaturan publikasi jobsheet berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async publishJobsheetByMataKuliahHandler(req, res) {
    try {
      const { mataKuliahId, jobsheetId } = req.params;
      const result = await this._service.publishJobsheetByMataKuliah(
        mataKuliahId,
        jobsheetId,
        req.user.id,
        req.body,
      );

      return ok(res, { jobsheet: result }, 'Pengaturan publikasi jobsheet berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async publishJobsheetByKelasPraktikumHandler(req, res) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.params;
      const result = await this._service.publishJobsheetByKelasPraktikum(
        kelasPraktikumId,
        jobsheetId,
        req.user.id,
        req.body,
      );

      return ok(res, { jobsheet: result }, 'Pengaturan publikasi jobsheet berhasil disimpan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteJobsheetHandler(req, res) {
    try {
      const { courseId, jobsheetId } = req.params;
      const result = await this._service.deleteJobsheet(courseId, jobsheetId, req.user.id);

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil dihapus.');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteJobsheetByMataKuliahHandler(req, res) {
    try {
      const { mataKuliahId, jobsheetId } = req.params;
      const result = await this._service.deleteJobsheetByMataKuliah(mataKuliahId, jobsheetId, req.user.id);

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil dihapus.');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteJobsheetByKelasPraktikumHandler(req, res) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.params;
      const result = await this._service.deleteJobsheetByKelasPraktikum(kelasPraktikumId, jobsheetId, req.user.id);

      return ok(res, { jobsheet: result }, 'Jobsheet berhasil dihapus.');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postRemedialHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const { kelasPraktikumId, title, description, startAt, endAt, studentIds } = req.body;
      const remedialId = await this._remedialsService.createRemedial({
        jobsheetId,
        kelasPraktikumId,
        title,
        description,
        startAt,
        endAt,
        studentIds,
      }, req.user.id);

      return created(res, { remedialId }, 'Sesi remedial berhasil dibuat');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getRemedialsHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const remedials = await this._remedialsService.getRemedialsByJobsheet(jobsheetId, req.user.id);

      return ok(res, { remedials }, 'Sesi remedial berhasil diambil');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteRemedialHandler(req, res) {
    try {
      const { remedialId } = req.params;
      await this._remedialsService.deleteRemedial(remedialId, req.user.id);

      return ok(res, null, 'Sesi remedial berhasil dibatalkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async postRemedialStudentsHandler(req, res) {
    try {
      const { remedialId } = req.params;
      const { studentIds, studentId } = req.body;
      const ids = studentIds || (studentId ? [studentId] : []);
      await this._remedialsService.addStudentsToRemedial(remedialId, ids, req.user.id);

      return created(res, null, 'Mahasiswa remedial berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getRemedialStudentsHandler(req, res) {
    try {
      const { remedialId } = req.params;
      const students = await this._remedialsService.getRemedialStudents(remedialId, req.user.id);

      return ok(res, { students }, 'Daftar mahasiswa remedial berhasil diambil');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = LecturerJobsheetsHandler;
