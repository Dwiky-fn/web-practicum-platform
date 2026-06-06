const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '12h';

class TokenService {
  constructor() {
    this._secret = process.env.AUTH_TOKEN_SECRET || process.env.JWT_SECRET;
    this._expiresIn = process.env.AUTH_TOKEN_EXPIRES_IN || DEFAULT_EXPIRES_IN;

    if (!this._secret) {
      this._secret = process.env.NODE_ENV === 'production'
        ? null
        : 'development-only-auth-secret';
    }
  }

  sign(user) {
    if (!this._secret) {
      throw new Error('AUTH_TOKEN_SECRET_REQUIRED');
    }

    return jwt.sign(
      { role: user.role },
      this._secret,
      {
        subject: user.id,
        expiresIn: this._expiresIn,
      },
    );
  }

  verify(token) {
    if (!this._secret) {
      throw new Error('AUTH_TOKEN_SECRET_REQUIRED');
    }

    try {
      const payload = jwt.verify(token, this._secret);

      if (!payload.sub || !payload.role) {
        throw new Error('AUTH_TOKEN_INVALID');
      }

      return {
        sub: payload.sub,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('AUTH_TOKEN_EXPIRED');
      }

      if (error.message === 'AUTH_TOKEN_INVALID') {
        throw error;
      }

      throw new Error('AUTH_TOKEN_INVALID');
    }
  }
}

module.exports = TokenService;
