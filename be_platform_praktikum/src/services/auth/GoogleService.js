const { OAuth2Client } = require('google-auth-library');

class GoogleService {
  constructor() {
    this._clientId = process.env.GOOGLE_CLIENT_ID;
    this._client = new OAuth2Client(this._clientId);
  }

  async verifyCredential(credential) {
    if (!credential) {
      throw new Error('GOOGLE_CREDENTIAL_REQUIRED');
    }

    if (!this._clientId) {
      throw new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
    }

    let ticket;

    try {
      ticket = await this._client.verifyIdToken({
        idToken: credential,
        audience: this._clientId,
      });
    } catch (error) {
      console.error('Google ID token verification failed:', error.message);
      throw new Error('GOOGLE_INVALID');
    }

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('GOOGLE_INVALID');
    }

    if (!payload.email_verified) {
      throw new Error('GOOGLE_EMAIL_NOT_VERIFIED');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      fullname: payload.name,
      avatarUrl: payload.picture,
    };
  }
}

module.exports = GoogleService;
