const pool = require('.');

class CoursesService {
  constructor() {
    this._pool = pool;
  }

  async getAllCourses() {
    const result = await this._pool.query(`
      SELECT
        id,
        name,
        code,
        semester,
        sks,
        status,
        created_at
      FROM courses
      ORDER BY semester ASC, name ASC
    `);

    return result.rows;
  }

  async getCoursesByStudentId(studentId) {
    const result = await this._pool.query(
      `
      SELECT DISTINCT
        c.id,
        c.name,
        c.code,
        c.semester,
        c.sks,
        c.status,
        c.created_at,
        u.fullname AS lecturer,
        0 AS progress
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      JOIN courses c ON c.id = cl.course_id
      LEFT JOIN users u ON u.id = cl.lecturer_id
      WHERE cs.student_id = $1
        AND cs.status = 'AKTIF'
        AND cl.status = 'AKTIF'
        AND c.status = 'AKTIF'
      ORDER BY c.semester ASC, c.name ASC
      `,
      [studentId],
    );

    return result.rows;
  }

  async getCourseById(courseId) {
    const result = await this._pool.query(
      `
      SELECT
        id,
        name,
        code,
        semester,
        sks,
        status,
        created_at
      FROM courses
      WHERE id = $1
      `,
      [courseId],
    );

    if (!result.rows.length) {
      throw new Error('COURSE_NOT_FOUND');
    }

    return result.rows[0];
  }
}

module.exports = CoursesService;
