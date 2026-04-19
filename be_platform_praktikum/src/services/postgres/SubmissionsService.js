const pool = require('./index');
const { nanoid } = require('nanoid');

class SubmissionsService {
  constructor() {
    this._pool = pool;
  }

  async createSubmission({ jobsheetId, studentId, report, status = 'DRAFT' }) {
    const id = `submission-${nanoid(10)}`;

    const query = {
      text: `
      INSERT INTO task_submission
      (id, jobsheet_id, student_id, report, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      values: [id, jobsheetId, studentId, JSON.stringify(report), status],
    };

    const result = await this._pool.query(query);

    return result.rows[0];
  }

  async getSubmissionByJobsheetId(jobsheetId, studentId) {
    const result = await this._pool.query(
      `SELECT * FROM task_submission
        WHERE jobsheet_id = $1 AND student_id = $2
        LIMIT 1`,
      [jobsheetId, studentId],
    );

    // 🔥 kalau belum ada → auto create
    if (result.rows.length === 0) {
      const newSubmission = await this.createSubmission({
        jobsheetId,
        studentId,
        report: {
          experiments: [],
          exercises: [],
          conclusion: null,
        },
        status: 'DRAFT',
      });

      return newSubmission;
    }

    return result.rows[0];
  }

  async updateSubmission({ jobsheetId, studentId, report, status }) {
    const query = {
      text: `
      UPDATE task_submission
      SET 
        report = $1,
        status = COALESCE($2, status),
        updated_at = CURRENT_TIMESTAMP,
        submitted_at = CASE 
          WHEN $2 = 'SUBMITTED' THEN CURRENT_TIMESTAMP 
          ELSE submitted_at 
        END
      WHERE jobsheet_id = $3 AND student_id = $4
      RETURNING *
    `,
      values: [JSON.stringify(report), status ?? null, jobsheetId, studentId],
    };

    const result = await this._pool.query(query);

    return result.rows[0];
  }
}

module.exports = SubmissionsService;
