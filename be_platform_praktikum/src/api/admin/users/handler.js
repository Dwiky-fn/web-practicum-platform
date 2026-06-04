const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');

class AdminUsersHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getUsersHandler(req, res) {
    try {
      const users = await this._service.getUsers(req.query.role, req.query);
      return ok(res, { users });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async getUserByIdHandler(req, res) {
    try {
      const user = await this._service.getUserById(req.params.id);
      return ok(res, { user });
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createStudentHandler(req, res) {
    try {
      const user = await this._service.createUser('MAHASISWA', req.body);
      return created(res, { user }, 'Mahasiswa berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async createLecturerHandler(req, res) {
    try {
      const user = await this._service.createUser('DOSEN', req.body);
      return created(res, { user }, 'Dosen berhasil ditambahkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async activateUserHandler(req, res) {
    try {
      const user = await this._service.setUserActive(req.params.id, true);
      return ok(res, { user }, 'Pengguna berhasil diaktifkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deactivateUserHandler(req, res) {
    try {
      const user = await this._service.setUserActive(req.params.id, false);
      return ok(res, { user }, 'Pengguna berhasil dinonaktifkan');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }

  async deleteUserHandler(req, res) {
    try {
      await this._service.deleteUser(req.params.id);
      return ok(res, {}, 'Pengguna berhasil dihapus');
    } catch (error) {
      return handleAdminError(error, res);
    }
  }
}

module.exports = AdminUsersHandler;
