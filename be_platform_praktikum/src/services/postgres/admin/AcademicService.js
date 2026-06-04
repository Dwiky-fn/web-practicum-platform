const pool = require('..');
const {
  createId,
  dbTerm,
  displayStatus,
  displayTerm,
  normalizeStatus,
} = require('./utils');

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

    try {
      await client.query('BEGIN');
      if (isActive) {
        await client.query('UPDATE academic_periods SET is_active = false');
      }
      await client.query(
        `INSERT INTO academic_periods (id, year, semester_type, is_active)
         VALUES ($1, $2, $3, $4)`,
        [id, payload.year, dbTerm(payload.term || payload.semester), isActive],
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

  async getCourses(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let semesterClause = '';

    if (filters.semester && filters.semester !== 'all') {
      params.push(Number(filters.semester));
      semesterClause = `AND semester = $${params.length}`;
    }

    const result = await this._pool.query(
      `
      SELECT id, code, name, semester, sks, status
      FROM courses
      WHERE ($1 = '%%' OR LOWER(code) LIKE $1 OR LOWER(name) LIKE $1)
        ${semesterClause}
      ORDER BY semester ASC, name ASC
      `,
      params,
    );

    return result.rows.map((row) => ({
      ...row,
      status: displayStatus(row.status),
    }));
  }

  async createCourse(payload) {
    const id = payload.id || createId('mk');
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
      'SELECT id FROM courses WHERE id = $1',
      [id],
    );

    if (!current.rows.length) throw new Error('COURSE_NOT_FOUND');

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
}

module.exports = AcademicService;
