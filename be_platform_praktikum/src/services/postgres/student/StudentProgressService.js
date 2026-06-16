const pool = require('..');
const { randomUUID } = require('crypto');

class StudentProgressService {
  constructor() {
    this._pool = pool;
  }

  async _resolveAcademicContext(studentId, jobsheetId, kelasPraktikumId) {
    if (kelasPraktikumId) {
      const nativeResult = await this._pool.query(
        `SELECT
          kp.id AS id_kelas_praktikum,
          km.id AS id_kelas_mhs
         FROM kelas_praktikum kp
         JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
          AND km.id_mahasiswa = $1
         WHERE kp.id = $2
           AND jc.jobsheet_id = $3
         LIMIT 1`,
        [studentId, kelasPraktikumId, jobsheetId],
      );

      if (nativeResult.rows.length) return nativeResult.rows[0];
    }

    throw new Error('CLASS_NOT_FOUND_FOR_STUDENT');
  }

  async getProgress(studentId, jobsheetId, kelasPraktikumId) {
    const result = await this._pool.query(
      `SELECT * FROM student_progress
       WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3
       LIMIT 1`,
      [studentId, jobsheetId, kelasPraktikumId],
    );
    return result.rows[0] || null;
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
    const id = `progress-${randomUUID().slice(0, 8)}`;
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      kelasPraktikumId,
    );
    const safeCompletedItems = Array.isArray(completedItems)
      ? completedItems
      : [];

    const updateResult = await this._pool.query(
      `UPDATE student_progress
       SET id_kelas_mhs = COALESCE(id_kelas_mhs, $4),
           status = $5,
           progress = GREATEST(progress, $6),
           last_page = $7,
           last_activity = CURRENT_TIMESTAMP,
           completed_items = $8::jsonb
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
       RETURNING *`,
      [
        studentId,
        jobsheetId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        status,
        progress,
        lastPage,
        JSON.stringify(safeCompletedItems),
      ],
    );

    if (updateResult.rows.length) return updateResult.rows[0];

    const result = await this._pool.query(
      `INSERT INTO student_progress
         (id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs, status, progress, last_page, last_activity, completed_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9::jsonb)
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
      ],
    );

    return result.rows[0];
  }
}

module.exports = StudentProgressService;
