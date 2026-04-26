class Judge0RunnerService {
  constructor(judge0Service) {
    this._judge0Service = judge0Service;
  }

  async run({ source_code, language_id, stdin }) {
    return await this._judge0Service.runCode({
      source_code,
      language_id,
      stdin,
    });
  }
}

module.exports = Judge0RunnerService;
