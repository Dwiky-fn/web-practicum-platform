const ClientError = require('./ClientError');

class AuthorizationError extends ClientError {
  constructor(message = 'Anda tidak memiliki akses') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

module.exports = AuthorizationError;
