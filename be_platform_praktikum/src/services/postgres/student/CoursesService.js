const pool = require('..');

class CoursesService {
  constructor() {
    this._pool = pool;
  }

  async _hasCourseDescriptionColumn() {
    const result = await this._pool.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'courses'
        AND column_name = 'description'
      LIMIT 1
      `,
    );

    return result.rowCount > 0;
  }

  async _getCourseDescriptionSelect(alias = '') {
    const hasDescription = await this._hasCourseDescriptionColumn();
    const prefix = alias ? `${alias}.` : '';

    return hasDescription ? `${prefix}description` : "'' AS description";
  }

  async getAllCourses() {
    const descriptionSelect = await this._getCourseDescriptionSelect();

    const result = await this._pool.query(`
      SELECT
        id,
        name,
        code,
        ${descriptionSelect},
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
    const hasDescription = await this._hasCourseDescriptionColumn();
    const descriptionSelect = hasDescription ? 'c.description' : "'' AS description";
    const descriptionGroupBy = hasDescription ? 'c.description,' : '';

    const result = await this._pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.code,
        ${descriptionSelect},
        c.semester,
        c.sks,
        c.status,
        c.created_at,
        u.fullname AS lecturer,
        COALESCE(ROUND(AVG(sp.progress)::numeric), 0)::int AS progress,
        COUNT(DISTINCT j.id)::int AS jobsheet_count
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      JOIN courses c ON c.id = cl.course_id
      LEFT JOIN users u ON u.id = cl.lecturer_id
      LEFT JOIN jobsheets j ON j.course_id = c.id AND j.status != 'UNPUBLISHED'
      LEFT JOIN student_progress sp
        ON sp.student_id = cs.student_id
       AND sp.class_id = cl.id
       AND sp.jobsheet_id = j.id
      WHERE cs.student_id = $1
        AND cs.status = 'AKTIF'
        AND cl.status = 'AKTIF'
        AND c.status = 'AKTIF'
      GROUP BY
        c.id,
        c.name,
        c.code,
        ${descriptionGroupBy}
        c.semester,
        c.sks,
        c.status,
        c.created_at,
        u.fullname
      ORDER BY c.semester ASC, c.name ASC
      `,
      [studentId],
    );

    return result.rows;
  }

  async getCourseById(courseId) {
    const descriptionSelect = await this._getCourseDescriptionSelect();

    const result = await this._pool.query(
      `
      SELECT
        id,
        name,
        code,
        ${descriptionSelect},
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
