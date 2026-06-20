const pool = require('..');
const { createId } = require('../admin/utils');

class LecturerReviewsService {
  constructor() {
    this._pool = pool;
  }

  async ensureSubmissionAccess(submissionId, lecturerId, client = this._pool) {
    const result = await client.query(
      `
      SELECT ts.id, ts.id_kelas_praktikum
      FROM task_submissions ts
      JOIN kelas_praktikum kp ON kp.id = ts.id_kelas_praktikum
      JOIN pengampu p ON p.id_kelas_praktikum = kp.id
      WHERE ts.id = $1
        AND p.id_dosen = $2
      LIMIT 1
      `,
      [submissionId, lecturerId],
    );

    if (!result.rows.length) {
      throw new Error('Anda tidak memiliki akses ke kelas praktikum ini.');
    }

    return result.rows[0];
  }

  async saveSubmissionReview(payload, lecturerId) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      await this.ensureSubmissionAccess(payload.submissionId, lecturerId, client);

      const existing = await client.query(
        `
        SELECT id
        FROM submission_reviews
        WHERE submission_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
        [payload.submissionId],
      );

      const reviewId = existing.rows[0]?.id || createId('rev');
      const aiFeedback = payload.aiFeedback || {};

      const clampedAiScore = payload.aiScore !== undefined && payload.aiScore !== null
        ? Math.min(100, Math.max(0, Number(payload.aiScore)))
        : null;
      const clampedFinalScore = payload.finalScore !== undefined && payload.finalScore !== null
        ? Math.min(100, Math.max(0, Number(payload.finalScore)))
        : null;

      if (existing.rows.length) {
        await client.query(
          `
          UPDATE submission_reviews
          SET
            lecturer_id = $2,
            ai_score = $3,
            final_score = $4,
            ai_feedback = $5,
            feedback = $6,
            decision = $7
          WHERE id = $1
          `,
          [
            reviewId,
            lecturerId,
            clampedAiScore,
            clampedFinalScore,
            JSON.stringify(aiFeedback),
            payload.feedback || null,
            payload.decision || 'PENDING',
          ],
        );
      } else {
        await client.query(
          `
          INSERT INTO submission_reviews (
            id, submission_id, lecturer_id, ai_score, final_score,
            ai_feedback, feedback, decision
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            reviewId,
            payload.submissionId,
            lecturerId,
            clampedAiScore,
            clampedFinalScore,
            JSON.stringify(aiFeedback),
            payload.feedback || null,
            payload.decision || 'PENDING',
          ],
        );
      }

      await client.query(
        `
        UPDATE task_submissions
        SET status = 'REVIEWED'
        WHERE id = $1
        `,
        [payload.submissionId],
      );

      const reviewResult = await client.query(
        `
        SELECT
          sr.id,
          sr.ai_score,
          sr.final_score,
          sr.feedback,
          sr.decision,
          COALESCE(sr.ai_feedback, '{}'::jsonb) AS ai_feedback
        FROM submission_reviews sr
        WHERE sr.id = $1
        LIMIT 1
        `,
        [reviewId],
      );

      await client.query('COMMIT');
      return reviewResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAiFeedbackForSubmission(submissionId, lecturerId) {
    await this.ensureSubmissionAccess(submissionId, lecturerId);

    const result = await this._pool.query(
      `
      UPDATE submission_reviews
      SET
        ai_score = NULL,
        ai_feedback = NULL
      WHERE submission_id = $1
      RETURNING id
      `,
      [submissionId],
    );

    return {
      affectedReviews: result.rowCount,
    };
  }
}

module.exports = LecturerReviewsService;
