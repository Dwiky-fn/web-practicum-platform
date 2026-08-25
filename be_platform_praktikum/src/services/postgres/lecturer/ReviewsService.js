const pool = require('..');
const { createId } = require('../admin/utils');
const MonitoringActivityService = require('../../monitoring/MonitoringActivityService');
const { calculateFinalReviewScore } = require('../../review/SubmissionReviewScoringService');

class LecturerReviewsService {
  constructor() {
    this._pool = pool;
  }

  async ensureSubmissionAccess(submissionId, lecturerId, client = this._pool) {
    const result = await client.query(
      `
      SELECT ts.id, ts.status, ts.id_kelas_praktikum, tys.status AS tahun_semester_status
      FROM task_submissions ts
      JOIN kelas_praktikum kp ON kp.id = ts.id_kelas_praktikum
      JOIN tahun_semester tys ON tys.id = kp.id_tahun_semester
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

    const row = result.rows[0];
    const submittedStatuses = ['SUBMITTED', 'REVIEWED', 'ACCEPTED', 'REVISION', 'REVIEWING'];
    if (!submittedStatuses.includes(row.status)) {
      throw new Error('Mahasiswa belum mengumpulkan jobsheet.');
    }

    return row;
  }

  assertActiveTeachingContext(access) {
    if (String(access.tahun_semester_status || '').toLowerCase() !== 'active') {
      throw new Error('Data riwayat pengajaran bersifat read-only dan tidak dapat diubah.');
    }
  }

  async getReviewScoringContext(submissionId, client = this._pool) {
    const submission = await client.query(
      `SELECT ts.jobsheet_id, ts.score_breakdown
       FROM task_submissions ts
       WHERE ts.id = $1
       LIMIT 1`,
      [submissionId],
    );

    if (!submission.rows.length) {
      throw new Error('Submission tidak ditemukan.');
    }

    const jobsheetId = submission.rows[0].jobsheet_id;
    const [experiments, exercises] = await Promise.all([
      client.query(
        `SELECT id, title, COALESCE(rubric, 0) AS rubric
         FROM experiments
         WHERE jobsheet_id = $1
         ORDER BY id ASC`,
        [jobsheetId],
      ),
      client.query(
        `SELECT id, title, COALESCE(rubric, 0) AS rubric
         FROM exercises
         WHERE jobsheet_id = $1
         ORDER BY id ASC`,
        [jobsheetId],
      ),
    ]);

    return {
      scoreBreakdown: submission.rows[0].score_breakdown,
      jobsheetParts: {
        theory: [],
        experiments: experiments.rows,
        exercises: exercises.rows,
      },
    };
  }

  async saveSubmissionReview(payload, lecturerId) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const access = await this.ensureSubmissionAccess(payload.submissionId, lecturerId, client);
      this.assertActiveTeachingContext(access);

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
      const existingReview = existing.rows.length
        ? await client.query(
          `SELECT ai_feedback FROM submission_reviews WHERE id = $1 LIMIT 1`,
          [existing.rows[0].id],
        )
        : { rows: [] };

      const previousAiFeedback = existingReview.rows[0]?.ai_feedback || {};
      const aiFeedback = {
        ...previousAiFeedback,
        ...(payload.aiFeedback || {}),
      };

      const clampedAiScore = payload.aiScore !== undefined && payload.aiScore !== null
        ? Math.min(100, Math.max(0, Number(payload.aiScore)))
        : null;
      const scoringContext = await this.getReviewScoringContext(payload.submissionId, client);
      const sectionEvaluations = payload.sectionEvaluations
        || aiFeedback.sectionEvaluations
        || aiFeedback.evaluations
        || [];
      const scoring = calculateFinalReviewScore({
        ...scoringContext,
        sectionEvaluations,
      });
      if (payload.decision === 'ACCEPTED' && !scoring.isComplete) {
        throw new Error('Masih ada Percobaan atau Latihan yang belum dinilai.');
      }

      const feedbacks = aiFeedback.feedbacks || [];
      aiFeedback.sectionEvaluations = scoring.evaluations;
      aiFeedback.scoreSummary = {
        ...(aiFeedback.scoreSummary || {}),
        finalLecturerScore: scoring.finalScore,
        totalMaxScore: scoring.totalWeight,
        theoryScore: scoring.theoryScore,
        sectionScore: scoring.sectionScore,
        isComplete: scoring.isComplete,
        missingRequired: scoring.missingRequired,
      };

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
            decision = $7,
            feedback_details = $8
          WHERE id = $1
          `,
          [
            reviewId,
            lecturerId,
            clampedAiScore,
            scoring.finalScore,
            JSON.stringify(aiFeedback),
            payload.feedback || null,
            payload.decision || 'PENDING',
            JSON.stringify(feedbacks),
          ],
        );
      } else {
        await client.query(
          `
          INSERT INTO submission_reviews (
            id, submission_id, lecturer_id, ai_score, final_score,
            ai_feedback, feedback, decision, feedback_details
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            reviewId,
            payload.submissionId,
            lecturerId,
            clampedAiScore,
            scoring.finalScore,
            JSON.stringify(aiFeedback),
            payload.feedback || null,
            payload.decision || 'PENDING',
            JSON.stringify(feedbacks),
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

      const submission = await client.query(
        `SELECT student_id, jobsheet_id, id_kelas_praktikum, calculated_progress_score
         FROM task_submissions
         WHERE id = $1
         LIMIT 1`,
        [payload.submissionId],
      );

      await client.query('COMMIT');

      if (submission.rows[0]) {
        await MonitoringActivityService.broadcastActivity({
          kelasPraktikumId: submission.rows[0].id_kelas_praktikum,
          studentId: submission.rows[0].student_id,
          jobsheetId: submission.rows[0].jobsheet_id,
          activityType: 'review_updated',
          lastActiveAt: new Date(),
          progressPercentage: submission.rows[0].calculated_progress_score,
          submissionStatus: 'REVIEWED',
        });
      }

      return reviewResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAiFeedbackForSubmission(submissionId, lecturerId) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const access = await this.ensureSubmissionAccess(submissionId, lecturerId, client);
      this.assertActiveTeachingContext(access);

      const existingRes = await client.query(
        `SELECT id, feedback_details FROM submission_reviews WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
        [submissionId],
      );

      let affectedReviews = 0;
      if (existingRes.rows.length > 0) {
        const reviewId = existingRes.rows[0].id;
        let details = existingRes.rows[0].feedback_details;
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch { details = []; }
        }
        if (!Array.isArray(details)) details = [];

        const cleanDetails = details.filter((fb) => fb && fb.source !== 'ai' && fb.source !== 'ai_edited_by_lecturer');

        const updateRes = await client.query(
          `
          UPDATE submission_reviews
          SET
            ai_score = NULL,
            ai_feedback = NULL,
            feedback_details = $2
          WHERE id = $1
          RETURNING id
          `,
          [reviewId, JSON.stringify(cleanDetails)],
        );
        affectedReviews = updateRes.rowCount;
      }

      await client.query(
        `
        UPDATE task_submissions
        SET
          ai_evaluation_status = 'none',
          ai_evaluation_error = NULL,
          ai_evaluation_started_at = NULL,
          ai_evaluation_finished_at = NULL,
          ai_evaluation_last_attempt_at = NULL
        WHERE id = $1
        `,
        [submissionId],
      );

      await client.query('COMMIT');

      return {
        affectedReviews,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async getFeedbacks(submissionId, lecturerId) {
    await this.ensureSubmissionAccess(submissionId, lecturerId);
    const result = await this._pool.query(
      `
      SELECT feedback_details
      FROM submission_reviews
      WHERE submission_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [submissionId],
    );
    if (!result.rows.length) {
      return [];
    }
    const details = result.rows[0].feedback_details;
    return typeof details === 'string' ? JSON.parse(details) : (details || []);
  }

  validateFeedbacks(feedbacks) {
    if (!Array.isArray(feedbacks)) {
      throw new Error('Daftar feedback tidak valid.');
    }

    feedbacks.forEach((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Feedback tidak valid.');
      }
      if (!String(item.content || '').trim()) {
        throw new Error('Isi feedback tidak boleh kosong.');
      }
      if (item.scope === 'code') {
        if (!item.fileName || typeof item.fileName !== 'string') {
          throw new Error('Komentar kode harus memiliki file.');
        }
        const startLine = Number(item.startLine);
        const endLine = Number(item.endLine || item.startLine);
        if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) {
          throw new Error('Baris komentar kode tidak valid.');
        }
      }
    });
  }

  async saveFeedbacks(submissionId, feedbacks, lecturerId) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const access = await this.ensureSubmissionAccess(submissionId, lecturerId, client);
      this.assertActiveTeachingContext(access);
      this.validateFeedbacks(feedbacks);
      const existing = await client.query(
        `
        SELECT id, ai_feedback
        FROM submission_reviews
        WHERE submission_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
        [submissionId],
      );
      if (existing.rows.length) {
        const reviewId = existing.rows[0].id;
        const aiFeedback = existing.rows[0].ai_feedback || {};
        const newAiFeedback = {
          ...aiFeedback,
          feedbacks: feedbacks,
        };
        await client.query(
          `
          UPDATE submission_reviews
          SET feedback_details = $2, ai_feedback = $3
          WHERE id = $1
          `,
          [reviewId, JSON.stringify(feedbacks), JSON.stringify(newAiFeedback)],
        );
      } else {
        const reviewId = createId('rev');
        const aiFeedback = { feedbacks: feedbacks };
        await client.query(
          `
          INSERT INTO submission_reviews (
            id, submission_id, lecturer_id, decision, feedback_details, ai_feedback
          )
          VALUES ($1, $2, $3, 'PENDING', $4, $5)
          `,
          [reviewId, submissionId, lecturerId, JSON.stringify(feedbacks), JSON.stringify(aiFeedback)],
        );
      }
      await client.query('COMMIT');
      return feedbacks;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = LecturerReviewsService;
