const autoBind = require('auto-bind');

class UsersHandler {
  constructor(service, cloudinaryService) {
    this._service = service;
    this._cloudinaryService = cloudinaryService;
    autoBind(this);
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
