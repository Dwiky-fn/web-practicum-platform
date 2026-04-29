  const pool = require('./index');

  class JobsheetsService {
    constructor() {
      this._pool = pool;
    }

    async getJobsheetFullById(jobsheetId, courseId) {
      // jobsheet
      const jobsheetRes = await this._pool.query(
        `SELECT
          j.*,
          pl.name AS programming_language,
          pl.display_name AS programming_language_display_name,
          pl.judge0_language_id,
          pl.file_extension AS programming_language_file_extension
        FROM jobsheets j
        LEFT JOIN programming_languages pl
          ON pl.id = j.programming_language_id
        WHERE j.id = $1 AND j.course_id = $2`,
        [jobsheetId, courseId],
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
