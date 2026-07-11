const { randomUUID } = require('crypto');
const pool = require('../postgres');
const MonitoringActivityService = require('../monitoring/MonitoringActivityService');

class CodeRunActivityLogger {
  constructor(db = pool) {
    this._pool = db;
  }

  async logRun({ userId, context = {}, executionId }) {
    if (!userId || !executionId) return;
    if (!context.jobsheetId || !context.kelasPraktikumId) return;

    const academicContext = await this._resolveAcademicContext({
      studentId: userId,
      jobsheetId: context.jobsheetId,
      kelasPraktikumId: context.kelasPraktikumId,
    });
    if (!academicContext) return;

    const attempt = await this._resolveAttempt({
      studentId: userId,
      jobsheetId: context.jobsheetId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      requestedAttemptType: context.attemptType,
      requestedRemedialId: context.remedialId,
    });

    const moduleType = context.moduleType === 'exercise' ? 'exercise' : 'experiment';
    const experimentId = moduleType === 'experiment' ? (context.experimentId || null) : null;
    const exerciseId = moduleType === 'exercise' ? (context.exerciseId || context.instructionId || null) : null;
    const instructionId = moduleType === 'experiment'
      ? (context.instructionId || null)
      : null;

    if (moduleType === 'experiment' && !experimentId) return;
    if (moduleType === 'exercise' && !exerciseId) return;

    const logId = `log-${randomUUID().slice(0, 12)}`;
    const metadata = {
      moduleType,
      executionId,
      source: 'execution_gateway',
      entryFile: context.entryFile || null,
    };

    await this._pool.query(
      `INSERT INTO student_jobsheet_activity_logs (
         id,
         student_id,
         jobsheet_id,
         id_kelas_praktikum,
         id_kelas_mhs,
         experiment_id,
         exercise_id,
         instruction_id,
         activity_type,
         metadata,
         attempt_no,
         attempt_type,
         remedial_id,
         execution_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CODE_RUN', $9, $10, $11, $12, $13)
       ON CONFLICT DO NOTHING`,
      [
        logId,
        userId,
        context.jobsheetId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        experimentId,
        exerciseId,
        instructionId,
        JSON.stringify(metadata),
        attempt.attemptNo,
        attempt.attemptType,
        attempt.remedialId,
        executionId,
      ],
    );

    await MonitoringActivityService.broadcastActivity({
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      studentId: userId,
      jobsheetId: context.jobsheetId,
      experimentId,
      exerciseId,
      instructionId,
      activityType: 'CODE_RUN',
      lastActiveAt: new Date().toISOString(),
    });
  }

  async _resolveAcademicContext({ studentId, jobsheetId, kelasPraktikumId }) {
    const result = await this._pool.query(
      `SELECT
         kp.id AS id_kelas_praktikum,
         km.id AS id_kelas_mhs
       FROM kelas_praktikum kp
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $1
        AND km.status = 'active'
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $2
        AND jc.is_active = true
       WHERE kp.id = $3
       LIMIT 1`,
      [studentId, jobsheetId, kelasPraktikumId],
    );

    return result.rows[0] || null;
  }

  async _resolveAttempt({
    studentId,
    jobsheetId,
    kelasPraktikumId,
    requestedAttemptType,
    requestedRemedialId,
  }) {
    if (requestedAttemptType === 'remedial' && requestedRemedialId) {
      const remedial = await this._pool.query(
        `SELECT id
         FROM jobsheet_remedials
         WHERE id = $1
           AND jobsheet_id = $2
           AND id_kelas_praktikum = $3
         LIMIT 1`,
        [requestedRemedialId, jobsheetId, kelasPraktikumId],
      );

      if (remedial.rows.length) {
        const progress = await this._pool.query(
          `SELECT attempt_no
           FROM student_jobsheet_progress
           WHERE student_id = $1
             AND jobsheet_id = $2
             AND id_kelas_praktikum = $3
             AND remedial_id = $4
           LIMIT 1`,
          [studentId, jobsheetId, kelasPraktikumId, requestedRemedialId],
        );

        return {
          attemptType: 'remedial',
          remedialId: requestedRemedialId,
          attemptNo: progress.rows[0]?.attempt_no || 2,
        };
      }
    }

    return {
      attemptType: 'normal',
      remedialId: null,
      attemptNo: 1,
    };
  }
}

module.exports = CodeRunActivityLogger;
