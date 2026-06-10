class AppError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = 'AppError';
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.details = Array.isArray(options.details) ? options.details : [];

    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
