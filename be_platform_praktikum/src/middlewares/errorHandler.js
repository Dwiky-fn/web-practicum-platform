const { ClientError } = require('../exceptions');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ClientError) {
    return res.status(error.statusCode).json({
      status: 'fail',
      message: error.message,
    });
  }

  if (
    Number.isInteger(error.statusCode)
    && error.statusCode >= 400
    && error.statusCode < 500
  ) {
    return res.status(error.statusCode).json({
      status: 'fail',
      message: error.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan pada server',
  });
}

module.exports = errorHandler;
