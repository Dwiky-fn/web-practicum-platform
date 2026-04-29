const pool = require('.');
const { nanoid } = require('nanoid');

class StudentProgressService {
  constructor() {
    this._pool = pool;
  }

  async getProgress(studentId, jobsheetId) {
    const result = await this._pool.query(
      `SELECT * FROM student_progress
       WHERE student_id = $1 AND jobsheet_id = $2
       LIMIT 1`,
      [studentId, jobsheetId],
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
  }) {
    const id = `progress-${nanoid(10)}`;

    const result = await this._pool.query(
      `INSERT INTO student_progress
         (id, student_id, jobsheet_id, class_id, status, progress, last_page, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, jobsheet_id)
       DO UPDATE SET
         status        = EXCLUDED.status,
         progress      = EXCLUDED.progress,
         last_page     = EXCLUDED.last_page,
         last_activity = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, studentId, jobsheetId, classId, status, progress, lastPage],
    );

    return result.rows[0];
  }
}

module.exports = StudentProgressService;
