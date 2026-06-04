const pool = require('.');

class ActivitiesService {
  constructor() {
    this._pool = pool;
  }

  async getRecentActivities(studentId) {
    const result = await this._pool.query(
      `
      SELECT *
      FROM (
        SELECT
          ts.id,
          ts.student_id,
          'TASK_SUBMITTED' AS type,
          'Tugas Dikumpulkan' AS title,
          CONCAT('Anda mengumpulkan ', j.title, '.') AS description,
          ts.submitted_at AS created_at
        FROM task_submissions ts
        JOIN jobsheets j ON j.id = ts.jobsheet_id
        WHERE ts.student_id = $1
          AND ts.submitted_at IS NOT NULL

        UNION ALL

        SELECT
          sp.id,
          sp.student_id,
          CASE
            WHEN sp.status = 'SELESAI' THEN 'TASK_SUBMITTED'
            ELSE 'TASK_CREATED'
          END AS type,
          CASE
            WHEN sp.status = 'SELESAI' THEN 'Jobsheet Diselesaikan'
            ELSE 'Progress Praktikum'
          END AS title,
          CONCAT('Progress ', j.title, ' tersimpan ', sp.progress, '%.') AS description,
          sp.last_activity AS created_at
        FROM student_progress sp
        JOIN jobsheets j ON j.id = sp.jobsheet_id
        WHERE sp.student_id = $1
          AND sp.last_activity IS NOT NULL
      ) activities
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [studentId],
    );

    return result.rows;
  }
}

module.exports = ActivitiesService;
