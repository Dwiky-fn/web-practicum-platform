const ClientError = require('./ClientError');

class InvariantError extends ClientError {
  constructor(message = 'Terjadi kesalahan pada request') {
    super(message, 400);
    this.name = 'InvariantError';
  }
}

module.exports = InvariantError;
