const pool = require('.');
const { randomUUID } = require('crypto');

class StudentProgressService {
  constructor() {
    this._pool = pool;
  }

  async _resolveClassId(studentId, jobsheetId, classId) {
    if (classId) return classId;

    const result = await this._pool.query(
      `SELECT cl.id
       FROM classes cl
       JOIN class_students cs ON cs.class_id = cl.id
       JOIN jobsheets j ON j.course_id = cl.course_id
       WHERE cs.student_id = $1
         AND j.id = $2
         AND cs.status = 'AKTIF'
         AND cl.status = 'AKTIF'
       ORDER BY cl.id ASC
       LIMIT 1`,
      [studentId, jobsheetId],
    );

    if (!result.rows.length) {
      throw new Error('CLASS_NOT_FOUND_FOR_STUDENT');
    }

    return result.rows[0].id;
  }

  async getProgress(studentId, jobsheetId, classId) {
    const values = [studentId, jobsheetId];
    const classFilter = classId ? 'AND class_id = $3' : '';
    if (classId) values.push(classId);

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
    progress,
    lastPage,
    status,
    completedItems,
  }) {
    const id = `progress-${randomUUID().slice(0, 8)}`;
    const resolvedClassId = await this._resolveClassId(
      studentId,
      jobsheetId,
      classId,
    );
    const safeCompletedItems = Array.isArray(completedItems)
      ? completedItems
      : [];

    const result = await this._pool.query(
      `INSERT INTO student_progress
         (id, student_id, jobsheet_id, class_id, status, progress, last_page, last_activity, completed_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8::jsonb)
       ON CONFLICT (student_id, jobsheet_id, class_id)
       DO UPDATE SET
         status        = EXCLUDED.status,
         progress      = GREATEST(student_progress.progress, EXCLUDED.progress),
         last_page     = EXCLUDED.last_page,
         last_activity = CURRENT_TIMESTAMP,
         completed_items = EXCLUDED.completed_items
       RETURNING *`,
      [
        id,
        studentId,
        jobsheetId,
        resolvedClassId,
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
