const autoBind = require('auto-bind');

class UsersHandler {
  constructor(service, cloudinaryService) {
    this._service = service;
    this._cloudinaryService = cloudinaryService;
    autoBind(this);
  }

  async loginHandler(req, res) {
    try {
      const { token, user } = await this._service.login(req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil',
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      const errors = {
        LOGIN_IDENTIFIER_REQUIRED: [400, 'Email atau NIM wajib diisi'],
        LOGIN_PASSWORD_REQUIRED: [400, 'Password wajib diisi'],
        LOGIN_INVALID: [401, 'Email/NIM atau password salah'],
        USER_INACTIVE: [403, 'Akun sudah dinonaktifkan'],
      };

      const detail = errors[error.message];

      if (detail) {
        const [statusCode, message] = detail;

        return res.status(statusCode).json({
          status: 'fail',
          message,
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  async getUserByIdHandler(req, res) {
    try {
      const { id } = req.params;

      const user = await this._service.getUserById(id);

      return res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  async updateUserByIdHandler(req, res) {
    try {
      const { id } = req.params;

      const user = await this._service.updateUser(id, req.body);

      return res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      if (error.message === 'USER_DUPLICATE') {
        return res.status(409).json({
          status: 'fail',
          message: 'Email, NIM, atau NIP sudah digunakan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  _getRequestUserId(req) {
    return req.user?.id || req.params.id;
  }

  _handleAccountError(error, res) {
    const errors = {
      USER_NOT_FOUND: [404, 'User tidak ditemukan'],
      EMAIL_REQUIRED: [400, 'Email baru wajib diisi'],
      EMAIL_INVALID: [400, 'Format email tidak valid'],
      EMAIL_SAME: [400, 'Email baru tidak boleh sama dengan email lama'],
      EMAIL_DUPLICATE: [409, 'Email sudah digunakan user lain'],
      CURRENT_PASSWORD_REQUIRED: [400, 'Password saat ini wajib diisi'],
      PASSWORD_INVALID: [401, 'Password saat ini salah'],
      NEW_PASSWORD_INVALID: [400, 'Password baru minimal 8 karakter'],
      PASSWORD_CONFIRM_MISMATCH: [400, 'Konfirmasi password baru tidak sama'],
    };

    const detail = errors[error.message];

    if (detail) {
      const [statusCode, message] = detail;

      return res.status(statusCode).json({
        status: 'fail',
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server',
    });
  }

  async updateUserEmailHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const user = await this._service.updateEmail(userId, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Email berhasil diperbarui',
        data: { user },
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async updateUserPasswordHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      await this._service.updatePassword(userId, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diperbarui',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async uploadUserAvatarHandler(req, res) {
    try {
      const { id } = req.params;
      const { image } = req.body;

      const avatarUrl = await this._cloudinaryService.uploadImage(image);
      const user = await this._service.updateAvatarUrl(id, avatarUrl);

      return res.status(200).json({
        status: 'success',
        data: {
          avatarUrl,
          user,
        },
      });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      if (error.message === 'INVALID_IMAGE') {
        return res.status(400).json({
          status: 'fail',
          message: 'File foto tidak valid',
        });
      }

      if (error.message === 'IMAGE_TOO_LARGE') {
        return res.status(413).json({
          status: 'fail',
          message: 'Ukuran foto maksimal 2 MB',
        });
      }

      if (error.message === 'CLOUDINARY_NOT_CONFIGURED') {
        return res.status(500).json({
          status: 'error',
          message: 'Cloudinary belum dikonfigurasi',
        });
      }

      if (
        error.message === 'CLOUDINARY_UPLOAD_FAILED' ||
        error.message === 'CLOUDINARY_URL_NOT_FOUND'
      ) {
        return res.status(502).json({
          status: 'error',
          message: 'Upload foto ke Cloudinary gagal',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  async deleteUserByIdHandler(req, res) {
    try {
      const { id } = req.params;

      await this._service.deactivateUser(id);

      return res.status(200).json({
        status: 'success',
        message: 'Akun berhasil dinonaktifkan',
      });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }
}

module.exports = UsersHandler;
