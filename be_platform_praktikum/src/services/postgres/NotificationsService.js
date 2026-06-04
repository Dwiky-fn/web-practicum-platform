const pool = require('.');

class NotificationsService {
  constructor() {
    this._pool = pool;
  }

  async getNotifications(studentId) {
    const result = await this._pool.query(
      `
      SELECT DISTINCT
        j.id,
        cs.student_id,
        'Jobsheet Aktif' AS title,
        CONCAT(j.title, ' tersedia pada ', c.name, '.') AS message,
        false AS is_read
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      JOIN courses c ON c.id = cl.course_id
      JOIN jobsheets j ON j.course_id = c.id
      LEFT JOIN student_progress sp
        ON sp.student_id = cs.student_id
       AND sp.class_id = cl.id
       AND sp.jobsheet_id = j.id
      WHERE cs.student_id = $1
        AND cs.status = 'AKTIF'
        AND cl.status = 'AKTIF'
        AND c.status = 'AKTIF'
        AND j.status = 'PUBLISHED'
        AND COALESCE(sp.progress, 0) < 100
      ORDER BY j.id ASC
      LIMIT 10
      `,
      [studentId],
    );

    return result.rows;
  }
}

module.exports = NotificationsService;
