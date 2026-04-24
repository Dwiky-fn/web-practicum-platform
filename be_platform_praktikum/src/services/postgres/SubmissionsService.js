const pool = require('./index');
const { nanoid } = require('nanoid');

class SubmissionsService {
  constructor(jobsheetService) {
    this._pool = pool;
    this._jobsheetService = jobsheetService;
  }

  _getDefaultFileName(language) {
    return 'Main.java';
  }

  _generateInitialReport(jobsheet) {
    const defaultFileName = this._getDefaultFileName(
      jobsheet.programming_language || 'java',
    );

    return {
      experiments: Object.fromEntries(
        (jobsheet.experiments || []).map((exp) => [
          exp.id,
          {
            steps: [
              {
                files: {
                  [defaultFileName]: exp.default_template_code || '',
                },
                output: '',
                analysis: { type: 'doc', content: [] },
              },
            ],
          },
        ]),
      ),

      exercises: Object.fromEntries(
        (jobsheet.exercises || []).map((exe) => [
          exe.id,
          {
            files: {
              [defaultFileName]: exe.default_template_code || '',
            },
            output: '',
            analysis: { type: 'doc', content: [] },
          },
        ]),
      ),

      conclusion: null,
    };
  }

  async createSubmission({
    jobsheetId,
    courseId,
    studentId,
    status = 'DRAFT',
  }) {
    // const id = `submission-${nanoid(10)}`;
    const id = `submission-1`;

    const jobsheet = await this._jobsheetService.getJobsheetFullById(
      jobsheetId,
      courseId,
    );

    const report = this._generateInitialReport(jobsheet);

    const query = {
      text: `
      INSERT INTO task_submission
      (id, jobsheet_id, student_id, report, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (jobsheet_id, student_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
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

    return result.rows[0] || null;
  }

  async getOrCreateSubmission(jobsheetId, courseId, studentId) {
    const existing = await this.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
    );
    if (existing) return existing;

    return await this.createSubmission({ jobsheetId, courseId, studentId });
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
            WHEN $2 = 'SUBMITTED' AND submitted_at IS NULL THEN CURRENT_TIMESTAMP 
            ELSE submitted_at 
          END
        WHERE jobsheet_id = $3 AND student_id = $4
        RETURNING *
      `,
      values: [JSON.stringify(report), status || null, jobsheetId, studentId],
    };

    const result = await this._pool.query(query);
    return result.rows[0];
  }

  async submitSubmission(jobsheetId, studentId) {
    const existing = await this.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
    );
    if (!existing) throw new Error('Submission tidak ditemukan');

    return await this.updateSubmission({
      jobsheetId,
      studentId,
      report: existing.report,
      status: 'SUBMITTED',
    });
  }
}

module.exports = SubmissionsService;
