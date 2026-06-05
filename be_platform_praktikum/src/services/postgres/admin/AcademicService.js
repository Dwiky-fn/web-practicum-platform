const pool = require('..');
const {
  createId,
  dbTerm,
  displayStatus,
  displayTerm,
  normalizeStatus,
} = require('./utils');

const activeStudentSemestersByTerm = {
  GANJIL: [1, 3, 5],
  GENAP: [2, 4, 6],
};

class AcademicService {
  constructor() {
    this._pool = pool;
  }

  async getSemesters() {
    const result = await this._pool.query(`
      SELECT id, year, semester_type, is_active
      FROM academic_periods
      ORDER BY is_active DESC, year DESC, semester_type ASC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      year: row.year,
      term: displayTerm(row.semester_type),
      status: row.is_active ? 'Aktif' : 'Nonaktif',
    }));
  }

  async createSemester(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('ap');
    const isActive = normalizeStatus(payload.status) === 'AKTIF';
    const term = dbTerm(payload.term || payload.semester);

    try {
      await client.query('BEGIN');
      const duplicate = await client.query(
        'SELECT id FROM academic_periods WHERE year = $1 AND semester_type = $2 LIMIT 1',
        [payload.year, term],
      );
      if (duplicate.rows.length) throw new Error('SEMESTER_DUPLICATE');

      if (isActive) {
        await client.query('UPDATE academic_periods SET is_active = false');
      }
      await client.query(
        `INSERT INTO academic_periods (id, year, semester_type, is_active)
         VALUES ($1, $2, $3, $4)`,
        [id, payload.year, term, isActive],
      );
      await client.query('COMMIT');
      return (await this.getSemesters()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async activateSemester(id) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT id FROM academic_periods WHERE id = $1', [id]);
      if (!found.rows.length) throw new Error('SEMESTER_NOT_FOUND');
      await client.query('UPDATE academic_periods SET is_active = false');
      await client.query('UPDATE academic_periods SET is_active = true WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSemester(id) {
    const found = await this._pool.query(
      'SELECT id, is_active FROM academic_periods WHERE id = $1',
      [id],
    );
    if (!found.rows.length) throw new Error('SEMESTER_NOT_FOUND');
    if (found.rows[0].is_active) throw new Error('SEMESTER_ACTIVE_DELETE');

    const used = await this._pool.query(
      'SELECT id FROM classes WHERE academic_period_id = $1 LIMIT 1',
      [id],
    );
    if (used.rows.length) throw new Error('SEMESTER_HAS_CLASSES');

    await this._pool.query('DELETE FROM academic_periods WHERE id = $1', [id]);
  }

  async getCourses(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let semesterClause = '';

    if (filters.semester && filters.semester !== 'all') {
      params.push(Number(filters.semester));
      semesterClause = `AND semester = $${params.length}`;
    }

    const [result, activePeriod] = await Promise.all([
      this._pool.query(
        `
        SELECT id, code, name, semester, sks, status
        FROM courses
        WHERE ($1 = '%%' OR LOWER(code) LIKE $1 OR LOWER(name) LIKE $1)
          ${semesterClause}
        ORDER BY semester ASC, name ASC
        `,
        params,
      ),
      this._pool.query(
        'SELECT semester_type FROM academic_periods WHERE is_active = true LIMIT 1',
      ),
    ]);

    const activeStudentSemesters =
      activeStudentSemestersByTerm[activePeriod.rows[0]?.semester_type] || [];

    return result.rows.map((row) => ({
      ...row,
      status: activeStudentSemesters.includes(Number(row.semester))
        ? displayStatus(row.status)
        : 'Nonaktif',
    }));
  }

  async createCourse(payload) {
    const id = payload.id || createId('mk');
    await this.ensureCourseUnique({
      code: payload.code,
      name: payload.name,
      semester: Number(payload.semester),
    });

    await this._pool.query(
      `INSERT INTO courses (id, name, code, semester, sks, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        payload.name,
        payload.code,
        Number(payload.semester),
        Number(payload.sks),
        normalizeStatus(payload.status),
      ],
    );

    return (await this.getCourses()).find((item) => item.id === id);
  }

  async updateCourse(id, payload) {
    const current = await this._pool.query(
      'SELECT id, code, name, semester FROM courses WHERE id = $1',
      [id],
    );

    if (!current.rows.length) throw new Error('COURSE_NOT_FOUND');

    await this.ensureCourseUnique({
      id,
      code: payload.code || current.rows[0].code,
      name: payload.name || current.rows[0].name,
      semester: payload.semester ? Number(payload.semester) : Number(current.rows[0].semester),
    });

    await this._pool.query(
      `UPDATE courses
       SET
        code = COALESCE($2, code),
        name = COALESCE($3, name),
        semester = COALESCE($4, semester),
        sks = COALESCE($5, sks),
        status = COALESCE($6, status)
       WHERE id = $1`,
      [
        id,
        payload.code || null,
        payload.name || null,
        payload.semester ? Number(payload.semester) : null,
        payload.sks ? Number(payload.sks) : null,
        payload.status ? normalizeStatus(payload.status) : null,
      ],
    );

    return (await this.getCourses()).find((item) => item.id === id);
  }

  async deleteCourse(id) {
    const found = await this._pool.query('SELECT id FROM courses WHERE id = $1', [id]);
    if (!found.rows.length) throw new Error('COURSE_NOT_FOUND');

    const used = await this._pool.query(
      'SELECT id FROM classes WHERE course_id = $1 LIMIT 1',
      [id],
    );
    if (used.rows.length) throw new Error('COURSE_HAS_CLASSES');

    await this._pool.query('DELETE FROM courses WHERE id = $1', [id]);
  }

  async ensureCourseUnique({ id, code, name, semester }) {
    const duplicate = await this._pool.query(
      `SELECT id FROM courses
       WHERE id <> COALESCE($1, '')
        AND (LOWER(code) = LOWER($2) OR (LOWER(name) = LOWER($3) AND semester = $4))
       LIMIT 1`,
      [id || '', code, name, Number(semester)],
    );

    if (duplicate.rows.length) throw new Error('COURSE_DUPLICATE');
  }
}

module.exports = AcademicService;
