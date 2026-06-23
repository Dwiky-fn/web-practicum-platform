const multer = require('multer');
const { InvariantError } = require('../exceptions');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new InvariantError('Format gambar tidak didukung. Gunakan PNG, JPG, JPEG, atau WEBP.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single('image');

const uploadImageMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InvariantError('Ukuran gambar maksimal 5 MB.'));
        }
        return next(new InvariantError(`Gagal mengunggah gambar: ${err.message}`));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new InvariantError('File gambar harus dikirimkan.'));
    }

    next();
  });
};

module.exports = uploadImageMiddleware;
