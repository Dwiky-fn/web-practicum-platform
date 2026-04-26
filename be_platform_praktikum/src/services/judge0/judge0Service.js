const axios = require('axios');

class Judge0Service {
  constructor() {
    this._baseUrl = process.env.JUDGE0_URL;
  }

  async runCode({ source_code, language_id, stdin }) {
    const response = await axios.post(
      `${this._baseUrl}/submissions?base64_encoded=false&wait=true`,
      {
        source_code,
        language_id,
        stdin,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
}

module.exports = Judge0Service;
