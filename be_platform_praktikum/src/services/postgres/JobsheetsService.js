const pool = require('./index');

class JobsheetsService {
  constructor() {
    this._pool = pool;
  }

  async getJobsheetFullById(jobsheetId) {
    // jobsheet
    const jobsheetRes = await this._pool.query(
      `SELECT * FROM jobsheets WHERE id = $1`,
      [jobsheetId],
    );

    if (!jobsheetRes.rows.length) {
      throw new Error('Jobsheet tidak ditemukan');
    }

    const jobsheet = jobsheetRes.rows[0];

    // theory
    const theoryRes = await this._pool.query(
      `SELECT * FROM theory 
       WHERE jobsheet_id = $1 
       ORDER BY "order" ASC`,
      [jobsheetId],
    );

    // experiments
    const expRes = await this._pool.query(
      `SELECT * FROM experiments 
       WHERE jobsheet_id = $1 
       ORDER BY "order" ASC`,
      [jobsheetId],
    );

    // exercises
    const exeRes = await this._pool.query(
      `SELECT * FROM exercises 
       WHERE jobsheet_id = $1 
       ORDER BY "order" ASC`,
      [jobsheetId],
    );

    return {
      ...jobsheet,
      theory: theoryRes.rows,
      experiments: expRes.rows,
      exercises: exeRes.rows,
    };
  }
}

module.exports = JobsheetsService;
