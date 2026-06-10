const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  void next;

  const statusCode = Number(error.statusCode) || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Request failed', {
    requestId: req.requestId || null,
    code: errorCode,
    statusCode,
    errorType: error.name || 'Error',
    message: error.message,
  });

  const response = {
    status: 'fail',
    message:
      statusCode >= 500 && isProduction && !(error instanceof AppError)
        ? 'Terjadi kesalahan pada server'
        : error.message || 'Terjadi kesalahan pada server',
    error: {
      code: errorCode,
      details: Array.isArray(error.details) ? error.details : [],
    },
    meta: {
      requestId: req.requestId || null,
    },
  };

  if (!isProduction && error.stack) {
    response.error.stack = error.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
