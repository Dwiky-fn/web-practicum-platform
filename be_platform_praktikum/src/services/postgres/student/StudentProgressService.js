const pool = require('..');
const { randomUUID } = require('crypto');
const DeadlineAccessService = require('./DeadlineAccessService');
const JobsheetProgressScoringService = require('../../scoring/JobsheetProgressScoringService');

class StudentProgressService {
  constructor() {
    this._pool = pool;
  }

  async _resolveAcademicContext(studentId, jobsheetId, kelasPraktikumId) {
    if (!kelasPraktikumId) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    const nativeResult = await this._pool.query(
      `SELECT
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM kelas_praktikum kp
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $3
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       LEFT JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $1
       WHERE kp.id = $2
       LIMIT 1`,
      [studentId, kelasPraktikumId, jobsheetId],
    );

    if (!nativeResult.rows.length) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    if (!nativeResult.rows[0].id_kelas_mhs) {
      throw new Error('Mahasiswa belum terdaftar pada kelas semester ini.');
    }

    return nativeResult.rows[0];
  }

  async getProgress(studentId, jobsheetId, kelasPraktikumId) {
    if (!kelasPraktikumId) return null;

    // Check active remedial
    const remedialQuery = await this._pool.query(
      `SELECT jr.id
       FROM jobsheet_remedials jr
       JOIN jobsheet_remedial_students jrs ON jrs.remedial_id = jr.id
       WHERE jr.jobsheet_id = $1 
         AND jr.id_kelas_praktikum = $2 
         AND jrs.student_id = $3
         AND jr.status = 'open'
         AND (NOW() AT TIME ZONE 'Asia/Jakarta') BETWEEN jr.start_at AND jr.end_at
       LIMIT 1`,
      [jobsheetId, kelasPraktikumId, studentId]
    );

    let queryStr = '';
    let params = [studentId, jobsheetId, kelasPraktikumId];
    if (remedialQuery.rows.length) {
      queryStr = `SELECT * FROM student_progress
                  WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3 AND remedial_id = $4
                  LIMIT 1`;
      params.push(remedialQuery.rows[0].id);
    } else {
      queryStr = `SELECT * FROM student_progress
                  WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3 AND remedial_id IS NULL
                  LIMIT 1`;
    }

    const result = await this._pool.query(queryStr, params);
    const academicContext = await this._resolveAcademicContext(studentId, jobsheetId, kelasPraktikumId);
    const activeRemedialId = remedialQuery.rows[0]?.id || null;
    const progress = result.rows[0] || {
      id: null,
      student_id: studentId,
      jobsheet_id: jobsheetId,
      id_kelas_praktikum: academicContext.id_kelas_praktikum,
      id_kelas_mhs: academicContext.id_kelas_mhs,
      status: 'BELUM',
      progress: 0,
      last_page: null,
      completed_items: [],
      attempt_no: activeRemedialId ? 2 : 1,
      attempt_type: activeRemedialId ? 'remedial' : 'normal',
      remedial_id: activeRemedialId,
    };

    const scoreBreakdown = await JobsheetProgressScoringService.calculate({
      studentId,
      jobsheetId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      idKelasMhs: academicContext.id_kelas_mhs,
      attemptType: activeRemedialId ? 'remedial' : 'normal',
      attemptNo: progress.attempt_no || (activeRemedialId ? 2 : 1),
      remedialId: activeRemedialId,
    });

    return {
      ...progress,
      calculated_progress_score: scoreBreakdown.progressScore,
      score_breakdown: scoreBreakdown,
    };
  }

  async upsertProgress({
    studentId,
    jobsheetId,
    kelasPraktikumId,
    progress,
    lastPage,
    status,
    completedItems,
  }) {
    const access = await DeadlineAccessService.assertCanSaveProgress({
      studentId,
      jobsheetId,
      kelasPraktikumId,
    });
    let activeRemedialId = access.remedialId;
    let attemptNo = access.attemptNo || 1;
    let attemptType = access.attemptType || 'normal';

    if (activeRemedialId) {
      const checkProgress = await this._pool.query(
        `SELECT attempt_no FROM student_progress
         WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3 AND remedial_id = $4
         LIMIT 1`,
        [studentId, jobsheetId, access.academicContext.id_kelas_praktikum, activeRemedialId],
      );
      if (checkProgress.rows.length) {
        attemptNo = checkProgress.rows[0].attempt_no;
      }
    }

    const id = `progress-${randomUUID().slice(0, 8)}`;
    const academicContext = access.academicContext;
    const safeCompletedItems = Array.isArray(completedItems) ? completedItems : [];

    const conflictTarget = activeRemedialId
      ? '(student_id, jobsheet_id, id_kelas_praktikum, remedial_id) WHERE (remedial_id IS NOT NULL)'
      : '(student_id, jobsheet_id, id_kelas_praktikum) WHERE (remedial_id IS NULL)';

    const result = await this._pool.query(
      `INSERT INTO student_progress
         (id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs, status, progress, last_page, last_activity, completed_items, attempt_no, attempt_type, remedial_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9::jsonb, $10, $11, $12)
       ON CONFLICT ${conflictTarget}
       DO UPDATE SET
         progress = EXCLUDED.progress,
         last_page = EXCLUDED.last_page,
         last_activity = CURRENT_TIMESTAMP,
         completed_items = EXCLUDED.completed_items,
         status = EXCLUDED.status,
         id_kelas_mhs = COALESCE(EXCLUDED.id_kelas_mhs, student_progress.id_kelas_mhs)
       RETURNING *`,
      [
        id,
        studentId,
        jobsheetId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        status,
        progress,
        lastPage,
        JSON.stringify(safeCompletedItems),
        attemptNo,
        attemptType,
        activeRemedialId,
      ],
    );

    return result.rows[0];
  }
}

module.exports = StudentProgressService;
