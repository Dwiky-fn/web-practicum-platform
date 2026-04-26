const autoBind = require('auto-bind');

class Judge0Handler {
  constructor(runnerService) {
    this._runnerService = runnerService;
    autoBind(this);
  }

  async runCodeHandler(req, res) {
    try {
      const { source_code, language_id, stdin } = req.body;

      const result = await this._runnerService.run({
        source_code,
        language_id,
        stdin,
      });

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        status: 'fail',
        message: 'Gagal menjalankan kode',
      });
    }
  }
}

module.exports = Judge0Handler;
