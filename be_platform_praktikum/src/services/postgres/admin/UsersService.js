const bcrypt = require('bcrypt');
const pool = require('..');
const {
  createId,
  displayStatus,
  mapLecturer,
  mapStudent,
  normalizeStatus,
} = require('./utils');

const DEFAULT_PASSWORD = 'password123';

class AdminUsersService {
  constructor() {
    this._pool = pool;
  }

  async getUsers(role, filters = {}) {
    const normalizedRole = role === 'lecturers' || role === 'DOSEN' ? 'DOSEN' : 'MAHASISWA';
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const semester = filters.semester;

    if (normalizedRole === 'DOSEN') {
      const result = await this._pool.query(
        `
        SELECT u.id, u.fullname, u.email, u.is_active,
          lp.nip, lp.program_studi, lp.jurusan, lp.status, lp.avatar_url,
          lp.no_telepon, lp.tempat_lahir, lp.tanggal_lahir, lp.kota
        FROM users u
        LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
        WHERE u.role = 'DOSEN'
          AND ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(COALESCE(lp.nip, '')) LIKE $1)
        ORDER BY u.fullname ASC
        `,
        [keyword],
      );

      return result.rows.map(mapLecturer);
    }

    const params = [keyword];
    let semesterClause = '';
    if (semester && semester !== 'all') {
      params.push(Number(semester));
      semesterClause = `AND sp.semester = $${params.length}`;
    }

    const result = await this._pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.is_active,
        sp.nim, sp.program_studi, sp.jurusan, sp.angkatan, sp.semester,
        sp.status, sp.avatar_url, sp.no_telepon, sp.tempat_lahir,
        sp.tanggal_lahir, sp.kota
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'MAHASISWA'
        AND ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(COALESCE(sp.nim, '')) LIKE $1)
        ${semesterClause}
      ORDER BY sp.semester ASC NULLS LAST, u.fullname ASC
      `,
      params,
    );

    return result.rows.map(mapStudent);
  }

  async getUserById(id) {
    const result = await this._pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!result.rows.length) throw new Error('USER_NOT_FOUND');

    const users = await this.getUsers(result.rows[0].role);
    const user = users.find((item) => item.id === id);
    if (!user) throw new Error('USER_NOT_FOUND');

    return user;
  }

  async createUser(role, payload) {
    const client = await this._pool.connect();
    const normalizedRole = role === 'lecturers' || role === 'DOSEN' ? 'DOSEN' : 'MAHASISWA';
    const prefix = normalizedRole === 'DOSEN' ? 'dosen' : 'mhs';
    const id = payload.id || createId(prefix);
    const defaultPassword = normalizedRole === 'MAHASISWA'
      ? payload.nim || DEFAULT_PASSWORD
      : DEFAULT_PASSWORD;
    const password = await bcrypt.hash(payload.password || defaultPassword, 10);

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (id, fullname, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          payload.fullname,
          payload.email,
          password,
          normalizedRole,
          normalizeStatus(payload.status) === 'AKTIF',
        ],
      );

      if (normalizedRole === 'DOSEN') {
        await client.query(
          `INSERT INTO lecturer_profiles (user_id, nip, program_studi, jurusan, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            payload.nip,
            payload.programStudi || payload.program_studi || 'Teknik Informatika',
            payload.jurusan || 'Teknologi Informasi',
            displayStatus(normalizeStatus(payload.status)),
          ],
        );
      } else {
        await client.query(
          `INSERT INTO student_profiles (user_id, nim, program_studi, jurusan, angkatan, semester, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            payload.nim,
            payload.programStudi || payload.program_studi || 'Teknik Informatika',
            payload.jurusan || 'Teknologi Informasi',
            payload.angkatan ? Number(payload.angkatan) : null,
            payload.semester ? Number(payload.semester) : null,
            displayStatus(normalizeStatus(payload.status)),
          ],
        );
      }

      await client.query('COMMIT');
      return this.getUserById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('USER_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async setUserActive(id, active) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const current = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [id],
      );

      if (!current.rows.length) throw new Error('USER_NOT_FOUND');

      const role = current.rows[0].role;
      const status = active ? 'Aktif' : 'Nonaktif';

      await client.query(
        'UPDATE users SET is_active = $2 WHERE id = $1',
        [id, active],
      );

      if (role === 'MAHASISWA') {
        await client.query(
          'UPDATE student_profiles SET status = $2 WHERE user_id = $1',
          [id, status],
        );
      }

      if (role === 'DOSEN') {
        await client.query(
          'UPDATE lecturer_profiles SET status = $2 WHERE user_id = $1',
          [id, status],
        );
      }

      await client.query('COMMIT');
      return this.getUserById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUser(id) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const current = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [id],
      );

      if (!current.rows.length) throw new Error('USER_NOT_FOUND');

      if (current.rows[0].role === 'DOSEN') {
        const assignedClasses = await client.query(
          'SELECT id FROM classes WHERE lecturer_id = $1 LIMIT 1',
          [id],
        );

        if (assignedClasses.rows.length) throw new Error('USER_HAS_CLASSES');
      }

      await client.query('DELETE FROM users WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AdminUsersService;
