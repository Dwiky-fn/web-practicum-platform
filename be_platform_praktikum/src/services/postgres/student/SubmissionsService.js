const pool = require('..');
const { randomUUID } = require('crypto');

class SubmissionsService {
  constructor(jobsheetService) {
    this._pool = pool;
    this._jobsheetService = jobsheetService;
  }

  _mapSubmissionRow(row) {
    if (!row) return null;

    return {
      ...row,
      report: row.report || null,
      review: row.review || undefined,
      score: row.score != null ? Number(row.score) : undefined,
    };
  }

  _buildSubmissionSelect() {
    return `
      SELECT
        ts.*,
        NULLIF(ts.report_html, '')::json AS report,
        sr.ai_score AS score,
        CASE
          WHEN sr.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', sr.id,
            'ai_score', sr.ai_score,
            'final_score', sr.final_score,
            'feedback', sr.feedback,
            'decision', sr.decision,
            'ai_feedback', COALESCE(sr.ai_feedback, '{}'::jsonb)
          )
        END AS review
      FROM task_submissions ts
      LEFT JOIN LATERAL (
        SELECT *
        FROM submission_reviews
        WHERE submission_id = ts.id
        ORDER BY id DESC
        LIMIT 1
      ) sr ON true
    `;
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
    const id = `sub-${randomUUID().slice(0, 12)}`;

    const jobsheet = await this._jobsheetService.getJobsheetFullById(
      jobsheetId,
      courseId,
    );

    const report = this._generateInitialReport(jobsheet);

    const query = {
      text: `
      WITH saved AS (
        INSERT INTO task_submissions
        (id, jobsheet_id, student_id, report_html, status, submitted_at)
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (jobsheet_id, student_id)
        DO UPDATE SET report_html = task_submissions.report_html
        RETURNING id
      )
      ${this._buildSubmissionSelect()}
      WHERE ts.id = (SELECT id FROM saved)
    `,
      values: [id, jobsheetId, studentId, JSON.stringify(report), status],
    };

    const result = await this._pool.query(query);

    return this._mapSubmissionRow(result.rows[0]);
  }

  async getSubmissionByJobsheetId(jobsheetId, studentId) {
    const result = await this._pool.query(
      `
      ${this._buildSubmissionSelect()}
      WHERE ts.jobsheet_id = $1 AND ts.student_id = $2
      LIMIT 1
      `,
      [jobsheetId, studentId],
    );

    return this._mapSubmissionRow(result.rows[0]) || null;
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
        WITH saved AS (
          UPDATE task_submissions
          SET 
            report_html = $1,
            status = COALESCE($2, status),
            submitted_at = CASE 
              WHEN $2 = 'SUBMITTED' AND submitted_at IS NULL THEN CURRENT_TIMESTAMP 
              ELSE submitted_at 
            END
          WHERE jobsheet_id = $3 AND student_id = $4
          RETURNING id
        )
        ${this._buildSubmissionSelect()}
        WHERE ts.id = (SELECT id FROM saved)
      `,
      values: [JSON.stringify(report), status || null, jobsheetId, studentId],
    };

    const result = await this._pool.query(query);
    return this._mapSubmissionRow(result.rows[0]);
  }

  async resetReviewForSubmission(submissionId, client = this._pool) {
    await client.query(
      `
      UPDATE submission_reviews
      SET
        final_score = NULL,
        feedback = NULL,
        decision = 'PENDING'
      WHERE submission_id = $1
      `,
      [submissionId],
    );
  }

  async submitSubmission(jobsheetId, studentId) {
    const existing = await this.getSubmissionByJobsheetId(jobsheetId, studentId);
    if (!existing) throw new Error('Submission tidak ditemukan');

    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
        UPDATE task_submissions
        SET
          report_html = $1,
          status = 'SUBMITTED',
          submitted_at = CASE
            WHEN submitted_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE submitted_at
          END
        WHERE jobsheet_id = $2 AND student_id = $3
        `,
        [JSON.stringify(existing.report), jobsheetId, studentId],
      );

      await this.resetReviewForSubmission(existing.id, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.getSubmissionByJobsheetId(jobsheetId, studentId);
  }
}

module.exports = SubmissionsService;
