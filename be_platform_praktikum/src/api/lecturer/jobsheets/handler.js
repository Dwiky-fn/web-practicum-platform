const autoBind = require('auto-bind');
const { created, ok, handleAdminError } = require('../../admin/utils');
const LecturerJobsheetsValidator = require('../../../validator/lecturer/jobsheets');
const { createId } = require('../../../services/postgres/admin/utils');
const { InvariantError } = require('../../../exceptions');

class LecturerJobsheetsHandler {
  constructor(service, remedialsService, cloudinaryService) {
    this._service = service;
    this._remedialsService = remedialsService;
    this._cloudinaryService = cloudinaryService;
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

      const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
      if (!startAt || !endAt || !datetimeRegex.test(startAt) || !datetimeRegex.test(endAt)) {
        throw new InvariantError(
          "Format tanggal atau jam tidak valid.\nGunakan tanggal DD/MM/YYYY dan jam HH:mm."
        );
      }

      // Normalize to YYYY-MM-DD HH:mm:ss
      const normalizedStartAt = startAt.length === 16 ? `${startAt}:00` : startAt;
      const normalizedEndAt = endAt.length === 16 ? `${endAt}:00` : endAt;

      // Compare academic wall-clock strings directly; do not convert WIB input to UTC.
      if (normalizedEndAt <= normalizedStartAt) {
        throw new InvariantError("Waktu berakhir harus setelah waktu mulai.");
      }

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new InvariantError('Pilih minimal satu mahasiswa untuk remedial.');
      }

      const remedialId = await this._remedialsService.createRemedial({
        jobsheetId,
        kelasPraktikumId,
        title,
        description,
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
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

  async getEvaluationSubmissionsHandler(req, res) {
    try {
      const { jobsheetId } = req.params;
      const kelasPraktikumId = req.query.kelasPraktikumId || req.query.id_kelas_praktikum || req.query.classId;
      const items = await this._service.getEvaluationSubmissions(jobsheetId, kelasPraktikumId, req.user.id);

      return ok(res, { items }, 'Submission evaluasi berhasil diambil');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteRemedialHandler(req, res) {
    try {
      const { remedialId } = req.params;
      const remedial = await this._remedialsService.cancelRemedial(remedialId, req.user.id);

      return ok(res, { remedial }, remedial.alreadyCancelled ? 'Sesi remedial sudah dibatalkan.' : 'Sesi remedial berhasil dibatalkan');
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

  async postJobsheetImageHandler(req, res) {
    try {
      const { jobsheetId } = req.params;

      // Validate access
      await this._service.checkJobsheetAccess(jobsheetId, req.user.id);

      // Convert multer buffer to base64 data URI
      const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const { url, publicId, width, height } = await this._cloudinaryService.uploadImageDetailed(
        imageBase64,
        'platform-praktikum/jobsheets'
      );

      // Save to database
      const id = createId('img');
      await this._service.saveJobsheetImage({
        id,
        jobsheetId,
        uploadedBy: req.user.id,
        publicId,
        url,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        width,
        height,
      });

      return res.status(201).json({
        status: 'success',
        message: 'Gambar berhasil diunggah.',
        data: {
          image: {
            id,
            url,
            alt: '',
            width,
            height,
          },
        },
      });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteJobsheetImageHandler(req, res) {
    try {
      const { jobsheetId, imageId } = req.params;

      await this._service.deleteJobsheetImage(imageId, jobsheetId, req.user.id);

      return ok(res, null, 'Gambar berhasil dihapus.');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = LecturerJobsheetsHandler;
