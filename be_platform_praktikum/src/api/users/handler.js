const autoBind = require('auto-bind');
const { ClientError } = require('../../exceptions');
const UsersValidator = require('../../validator/users');

class UsersHandler {
  constructor(service, cloudinaryService) {
    this._service = service;
    this._cloudinaryService = cloudinaryService;
    autoBind(this);
  }

  async loginHandler(req, res) {
    try {
      const payload = UsersValidator.validateLoginPayload(req.body);
      const { token, user } = await this._service.login(payload);

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil',
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      if (error instanceof ClientError) {
        return this._sendClientError(error, res);
      }

      const errors = {
        LOGIN_IDENTIFIER_REQUIRED: [400, 'Email atau NIM wajib diisi'],
        LOGIN_PASSWORD_REQUIRED: [400, 'Password wajib diisi'],
        LOGIN_INVALID: [401, 'Email/NIM atau password salah'],
        USER_INACTIVE: [403, 'Akun sudah dinonaktifkan'],
      };

      const detail = errors[error.message];

      if (detail) {
        return this._sendMappedError(detail, res);
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan pada server',
      });
    }
  }

  async googleLoginHandler(req, res) {
    try {
      const payload = UsersValidator.validateGoogleLoginPayload(req.body);
      const { token, user } = await this._service.loginWithGoogle(payload);

      return res.status(200).json({
        status: 'success',
        message: 'Login Google berhasil',
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      if (error instanceof ClientError) {
        return this._sendClientError(error, res);
      }

      const errors = {
        GOOGLE_CREDENTIAL_REQUIRED: [400, 'Credential Google wajib diisi'],
        GOOGLE_INVALID: [401, 'Login Google tidak valid'],
        GOOGLE_EMAIL_NOT_VERIFIED: [403, 'Email Google belum terverifikasi'],
        GOOGLE_ACCOUNT_NOT_REGISTERED: [
          404,
          'Email Google belum terdaftar di sistem',
        ],
        GOOGLE_CLIENT_ID_NOT_CONFIGURED: [
          500,
          'Google Client ID belum dikonfigurasi',
        ],
        USER_INACTIVE: [403, 'Akun sudah dinonaktifkan'],
      };

      const detail = errors[error.message];

      if (detail) {
        return this._sendMappedError(detail, res);
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan pada server',
      });
    }
  }

  async requestPasswordResetOtpHandler(req, res) {
    try {
      const payload = UsersValidator.validatePasswordResetRequestPayload(req.body);
      await this._service.requestPasswordResetOtp(payload);

      return res.status(200).json({
        status: 'success',
        message: 'Jika email terdaftar, kode OTP akan dikirim ke email tersebut',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async resetPasswordWithOtpHandler(req, res) {
    try {
      const payload = UsersValidator.validateResetForgottenPasswordPayload(req.body);
      await this._service.resetPasswordWithOtp(payload);

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diperbarui',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async verifyPasswordResetOtpHandler(req, res) {
    try {
      const payload = UsersValidator.validateVerifyPasswordResetOtpPayload(req.body);
      const { resetToken } = await this._service.verifyPasswordResetOtp(payload);

      return res.status(200).json({
        status: 'success',
        message: 'OTP berhasil diverifikasi',
        data: {
          resetToken,
        },
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async resetForgottenPasswordHandler(req, res) {
    try {
      const payload = UsersValidator.validateResetForgottenPasswordPayload(req.body);
      await this._service.resetForgottenPassword(payload);

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diperbarui',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async requestUpdateEmailOtpHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const payload = UsersValidator.validateUpdateEmailRequestPayload(req.body);

      await this._service.requestUpdateEmailOtp(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Kode OTP telah dikirim ke email baru',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async verifyUpdateEmailOtpHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const payload = UsersValidator.validateVerifyEmailOtpPayload(req.body);

      const user = await this._service.verifyUpdateEmailOtp(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Email berhasil diperbarui',
        data: { user },
      });
    } catch (error) {
      return this._handleAccountError(error, res);
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
      if (error instanceof ClientError) {
        return this._sendClientError(error, res);
      }

      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'User tidak ditemukan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan pada server',
      });
    }
  }

  async updateUserByIdHandler(req, res) {
    try {
      const { id } = req.params;
      const payload = UsersValidator.validateUpdateUserPayload(req.body);

      const user = await this._service.updateUser(id, payload);

      return res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      if (error instanceof ClientError) {
        return this._sendClientError(error, res);
      }

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
        message: 'Terjadi kesalahan pada server',
      });
    }
  }

  _getRequestUserId(req) {
    return req.user?.id || req.params.id;
  }

  _sendClientError(error, res) {
    return res.status(error.statusCode).json({
      status: 'fail',
      message: error.message,
    });
  }

  _sendMappedError(detail, res) {
    const [statusCode, message] = detail;

    return res.status(statusCode).json({
      status: statusCode >= 500 ? 'error' : 'fail',
      message,
    });
  }

  _handleAccountError(error, res) {
    if (error instanceof ClientError) {
      return this._sendClientError(error, res);
    }

    const errors = {
      USER_NOT_FOUND: [404, 'User tidak ditemukan'],
      USER_EMAIL_NOT_FOUND: [404, 'Akun dengan email tersebut tidak ditemukan'],
      EMAIL_FORGOT_REQUIRED: [400, 'Email wajib diisi'],
      EMAIL_REQUIRED: [400, 'Email baru wajib diisi'],
      EMAIL_INVALID: [400, 'Format email tidak valid'],
      EMAIL_SAME: [400, 'Email baru tidak boleh sama dengan email lama'],
      EMAIL_DUPLICATE: [409, 'Email sudah digunakan user lain'],
      CURRENT_PASSWORD_REQUIRED: [400, 'Password saat ini wajib diisi'],
      PASSWORD_INVALID: [401, 'Password tidak sesuai'],
      NEW_PASSWORD_INVALID: [400, 'Password baru minimal 8 karakter'],
      PASSWORD_CONFIRM_MISMATCH: [400, 'Konfirmasi password baru tidak sama'],
      PASSWORD_SAME_AS_OLD: [400, 'Password baru tidak boleh sama dengan password lama'],

      OTP_REQUIRED: [400, 'OTP wajib diisi'],
      OTP_NOT_FOUND: [404, 'OTP tidak ditemukan, silakan minta OTP baru'],
      OTP_EXPIRED: [400, 'OTP sudah kedaluwarsa'],
      OTP_INVALID: [400, 'OTP tidak valid'],
      OTP_TOO_MANY_ATTEMPTS: [429, 'Terlalu banyak percobaan OTP'],
      RESET_TOKEN_REQUIRED: [400, 'Token reset password wajib diisi'],
      RESET_TOKEN_INVALID: [400, 'Token reset password tidak valid atau kedaluwarsa'],
      RESET_TOKEN_EXPIRED: [400, 'Token reset password sudah kedaluwarsa'],
    };

    const detail = errors[error.message];

    if (detail) {
      return this._sendMappedError(detail, res);
    }

    console.error(error);

    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server',
    });
  }

  async updateUserEmailHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const payload = UsersValidator.validateUpdateEmailRequestPayload(req.body);
      const user = await this._service.updateEmail(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Email berhasil diperbarui',
        data: { user },
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async verifyCurrentPasswordHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const payload = UsersValidator.validateVerifyCurrentPasswordPayload(req.body);
      await this._service.verifyCurrentPassword(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Password valid',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async updateUserPasswordHandler(req, res) {
    try {
      const userId = this._getRequestUserId(req);
      const payload = UsersValidator.validateUpdatePasswordPayload(req.body);
      await this._service.updatePassword(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diperbarui',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async changeAuthenticatedUserPasswordHandler(req, res) {
    try {
      const userId = req.user.id;
      const payload = UsersValidator.validateUpdatePasswordPayload(req.body);

      await this._service.changeAuthenticatedUserPassword(userId, payload);

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diubah',
      });
    } catch (error) {
      return this._handleAccountError(error, res);
    }
  }

  async uploadUserAvatarHandler(req, res) {
    try {
      const { id } = req.params;
      const { image } = UsersValidator.validateUploadAvatarPayload(req.body);

      const avatarUrl = await this._cloudinaryService.uploadImage(image);
      const user = await this._service.updateAvatarUrl(id, avatarUrl);

      return res.status(200).json({
        status: 'success',
        message: 'Foto profil berhasil diperbarui',
        data: {
          avatar_url: avatarUrl,
          avatarUrl,
          user,
        },
      });
    } catch (error) {
      if (error instanceof ClientError) {
        return this._sendClientError(error, res);
      }

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
        message: 'Terjadi kesalahan pada server',
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
        message: 'Terjadi kesalahan pada server',
      });
    }
  }
}

module.exports = UsersHandler;
