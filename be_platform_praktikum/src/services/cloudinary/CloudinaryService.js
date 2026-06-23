const crypto = require('crypto');

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

class CloudinaryService {
  _parseCloudinaryUrl(value) {
    if (!value) {
      return {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
      };
    }

    const url = new URL(value);

    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  }

  _getConfig() {
    return this._parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  }

  _createSignature(params, apiSecret) {
    const signaturePayload = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return crypto
      .createHash('sha1')
      .update(`${signaturePayload}${apiSecret}`)
      .digest('hex');
  }

  async uploadImage(image) {
    const { cloudName, apiKey, apiSecret } = this._getConfig();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('CLOUDINARY_NOT_CONFIGURED');
    }

    if (!image || typeof image !== 'string') {
      throw new Error('INVALID_IMAGE');
    }

    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      throw new Error('INVALID_IMAGE');
    }

    const base64Payload = image.split(',')[1] || '';
    const estimatedSize = Math.ceil((base64Payload.length * 3) / 4);

    if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('IMAGE_TOO_LARGE');
    }

    const formData = new FormData();
    const folder = 'platform-praktikum/avatars';
    const timestamp = Math.round(Date.now() / 1000);
    const signature = this._createSignature({ folder, timestamp }, apiSecret);

    formData.append('file', image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error('CLOUDINARY_UPLOAD_FAILED');
    }

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error('CLOUDINARY_URL_NOT_FOUND');
    }

    return data.secure_url;
  }

  async uploadImageDetailed(image, folder) {
    const { cloudName, apiKey, apiSecret } = this._getConfig();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('CLOUDINARY_NOT_CONFIGURED');
    }

    if (!image || typeof image !== 'string') {
      throw new Error('INVALID_IMAGE');
    }

    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      throw new Error('INVALID_IMAGE');
    }

    const formData = new FormData();
    const timestamp = Math.round(Date.now() / 1000);
    const signature = this._createSignature({ folder, timestamp }, apiSecret);

    formData.append('file', image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error('CLOUDINARY_UPLOAD_FAILED');
    }

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error('CLOUDINARY_URL_NOT_FOUND');
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  }
}

module.exports = CloudinaryService;
