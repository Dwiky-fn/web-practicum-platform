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
