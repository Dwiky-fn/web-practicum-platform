const pool = require('..');
const { randomUUID } = require('crypto');

class StudentProgressService {
  constructor() {
    this._pool = pool;
  }

  async _resolveAcademicContext(studentId, jobsheetId, classId, kelasPraktikumId) {
    if (kelasPraktikumId) {
      const nativeResult = await this._pool.query(
        `SELECT kp.legacy_class_id AS class_id,
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

    const params = [studentId, jobsheetId];
    let filter = '';

    if (kelasPraktikumId) {
      params.push(kelasPraktikumId);
      filter = `AND kp.id = $${params.length}`;
    } else if (classId) {
      params.push(classId);
      filter = `AND cl.id = $${params.length}`;
    }

    const result = await this._pool.query(
      `SELECT cl.id AS class_id,
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM classes cl
       JOIN class_students cs ON cs.class_id = cl.id
       JOIN jobsheets j ON j.course_id = cl.course_id
       LEFT JOIN kelas_praktikum kp ON kp.legacy_class_id = cl.id
       LEFT JOIN kelas_mhs km
         ON km.id_tahun_semester = kp.id_tahun_semester
        AND km.id_semester = kp.id_semester
        AND km.id_kelas = kp.id_kelas
        AND km.id_mahasiswa = cs.student_id
       WHERE cs.student_id = $1
         AND j.id = $2
         AND cs.status = 'AKTIF'
         AND cl.status = 'AKTIF'
         ${filter}
       ORDER BY cl.id ASC
       LIMIT 1`,
      params,
    );

    if (!result.rows.length) {
      throw new Error('CLASS_NOT_FOUND_FOR_STUDENT');
    }

    return result.rows[0];
  }

  async getProgress(studentId, jobsheetId, classId, kelasPraktikumId = null) {
    const values = [studentId, jobsheetId];
    let classFilter = '';
    if (kelasPraktikumId) {
      values.push(kelasPraktikumId);
      classFilter = `AND id_kelas_praktikum = $${values.length}`;
    } else if (classId) {
      values.push(classId);
      classFilter = `AND class_id = $${values.length}`;
    }

    const result = await this._pool.query(
      `SELECT * FROM student_progress
       WHERE student_id = $1 AND jobsheet_id = $2 ${classFilter}
       LIMIT 1`,
      values,
    );
    return result.rows[0] || null;
  }

  async upsertProgress({
    studentId,
    jobsheetId,
    classId,
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
      classId,
      kelasPraktikumId,
    );
    const safeCompletedItems = Array.isArray(completedItems)
      ? completedItems
      : [];

    const updateResult = await this._pool.query(
      `UPDATE student_progress
       SET id_kelas_mhs = COALESCE(id_kelas_mhs, $6),
           status = $7,
           progress = GREATEST(progress, $8),
           last_page = $9,
           last_activity = CURRENT_TIMESTAMP,
           completed_items = $10::jsonb
       WHERE student_id = $2
         AND jobsheet_id = $3
         AND (
           ($5::varchar IS NOT NULL AND id_kelas_praktikum = $5)
           OR ($5::varchar IS NULL AND class_id = $4)
         )
       RETURNING *`,
      [
        id,
        studentId,
        jobsheetId,
        academicContext.class_id,
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
         (id, student_id, jobsheet_id, class_id, id_kelas_praktikum, id_kelas_mhs, status, progress, last_page, last_activity, completed_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10::jsonb)
       RETURNING *`,
      [
        id,
        studentId,
        jobsheetId,
        academicContext.class_id,
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
