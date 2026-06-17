const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');
const { AuthorizationError } = require('../../../exceptions');
const ClassesValidator = require('../../../validator/admin/classes');

class ClassesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getClassesHandler(req, res) {
    try {
      const query = ClassesValidator.validateClassesQuery(req.query);
      const filters = {
        ...query,
        lecturerId: req.user.role === 'DOSEN' ? req.user.id : query.lecturerId,
      };

      return ok(res, { classes: await this._service.getClasses(filters) });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createClassHandler(req, res) {
    try {
      const payload = ClassesValidator.validateCreateClassPayload(req.body);
      const classItem = await this._service.createClass(payload);
      return created(res, { class: classItem }, 'Kelas berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getClassTemplatesHandler(req, res) {
    try {
      const query = ClassesValidator.validateGetClassTemplatesQuery(req.query);
      const classes = await this._service.getClassTemplates(query);
      return ok(res, { classes });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getClassClonePreviewHandler(req, res) {
    try {
      const preview = await this._service.getClassClonePreview(req.params.id);
      return ok(res, preview);
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async cloneClassHandler(req, res) {
    try {
      const payload = ClassesValidator.validateCloneClassPayload(req.body);

      const result = await this._service.cloneClass(payload);
      const message = result.students_added === 0 && payload.auto_enroll_students
        ? 'Kelas berhasil dibuat, tetapi tidak ada mahasiswa yang cocok dengan filter.'
        : 'Kelas berhasil dibuat dari template';

      return created(res, result, message);
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getClassByIdHandler(req, res) {
    try {
      const classItem = await this._service.getClassDetail(req.params.id);

      if (req.user.role === 'DOSEN' && classItem.lecturerId !== req.user.id) {
        throw new AuthorizationError('Anda hanya dapat mengakses kelas yang diampu');
      }

      return ok(res, { class: classItem });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async updateClassHandler(req, res) {
    try {
      const payload = ClassesValidator.validateUpdateClassPayload(req.body);
      const classItem = await this._service.updateClass(req.params.id, payload);
      return ok(res, { class: classItem }, 'Kelas berhasil diperbarui');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteClassHandler(req, res) {
    try {
      await this._service.deleteClass(req.params.id);
      return ok(res, {}, 'Kelas berhasil dihapus');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getStudentCandidatesHandler(req, res) {
    try {
      const students = await this._service.getStudentCandidates(req.params.id, req.query);
      return ok(res, { students });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async assignStudentsHandler(req, res) {
    try {
      const payload = ClassesValidator.validateAssignStudentsPayload(req.body);
      const students = await this._service.assignStudentsToClass(
        req.params.id,
        payload.studentIds,
      );
      return ok(res, { students }, 'Mahasiswa berhasil di-assign');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async removeStudentHandler(req, res) {
    try {
      const { id, studentId } = req.params;
      await this._service.removeStudentFromClass(id, studentId);
      return ok(res, {}, 'Mahasiswa berhasil dihapus dari kelas');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async assignClassSemesterHandler(req, res) {
    try {
      const payload = ClassesValidator.validateAssignClassSemesterPayload(req.body);
      const students = await this._service.assignClassSemesterStudentsToClass(
        req.params.id,
        payload.kelasSemesterId,
      );
      return ok(res, { students }, 'Mahasiswa berhasil di-assign dari kelas semester');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = ClassesHandler;
