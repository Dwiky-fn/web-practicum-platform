const ClientError = require('./ClientError');

class NotFoundError extends ClientError {
  constructor(message = 'Data tidak ditemukan') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = NotFoundError;
