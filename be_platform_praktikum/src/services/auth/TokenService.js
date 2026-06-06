const crypto = require('crypto');

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 12;

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

class TokenService {
  constructor() {
    this._secret = process.env.AUTH_TOKEN_SECRET || process.env.JWT_SECRET;
    this._expiresInSeconds = Number(
      process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS || DEFAULT_EXPIRES_IN_SECONDS,
    );

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

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      role: user.role,
      iat: now,
      exp: now + this._expiresInSeconds,
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = this._sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  verify(token) {
    if (!this._secret) {
      throw new Error('AUTH_TOKEN_SECRET_REQUIRED');
    }

    const [encodedPayload, signature] = String(token || '').split('.');

    if (!encodedPayload || !signature) {
      throw new Error('AUTH_TOKEN_INVALID');
    }

    const expectedSignature = this._sign(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    const isValidSignature =
      signatureBuffer.length === expectedSignatureBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

    if (!isValidSignature) {
      throw new Error('AUTH_TOKEN_INVALID');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || !payload.role || Number(payload.exp) <= now) {
      throw new Error('AUTH_TOKEN_EXPIRED');
    }

    return payload;
  }

  _sign(encodedPayload) {
    return crypto
      .createHmac('sha256', this._secret)
      .update(encodedPayload)
      .digest('base64url');
  }
}

module.exports = TokenService;
