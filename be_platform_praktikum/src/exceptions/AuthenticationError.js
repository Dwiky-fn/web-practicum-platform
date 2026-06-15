const ClientError = require('./ClientError');

class AuthenticationError extends ClientError {
  constructor(message = 'Autentikasi gagal') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

module.exports = AuthenticationError;
