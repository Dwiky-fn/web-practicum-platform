const pool = require('..');
const { createId } = require('./utils');

const normalizeSimpleStatus = (value, fallback = 'inactive') => String(value || fallback).toLowerCase();
const normalizeClassStatus = (value, fallback = 'draft') => String(value || fallback).toLowerCase();
const normalizeClassName = (value) => String(value || '').trim().toUpperCase();
const normalizeCourseType = (value) => String(value || 'praktikum').toLowerCase();
const normalizeRole = (value) => String(value || 'utama').toLowerCase();

const createClientError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

class AcademicDataService {
  constructor() {
    this._pool = pool;
  }

  async _ensureExists(client, table, id, errorCode, role = null) {
    const roleClause = role ? ' AND role = $2' : '';
    const params = role ? [id, role] : [id];
    const result = await client.query(`SELECT id FROM ${table} WHERE id = $1${roleClause} LIMIT 1`, params);
    if (!result.rows.length) throw new Error(errorCode);
  }

  async _ensureUnused(table, column, value, errorCode) {
    const result = await this._pool.query(`SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`, [value]);
    if (result.rows.length) throw new Error(errorCode);
  }

  async _ensureNoRows(query, params, errorCode) {
    const result = await this._pool.query(query, params);
    if (result.rows.length) throw new Error(errorCode);
  }

  async _tableExists(client, tableName) {
    const result = await client.query('SELECT to_regclass($1) AS table_name', [tableName]);
    return Boolean(result.rows[0]?.table_name);
  }

  _throwDeleteGuard(message) {
    throw createClientError(message, 409);
  }

  _kelasPraktikumDeleteMessage(counts) {
    const blockers = [
      counts.jobsheets > 0 ? 'jobsheets' : null,
      counts.progress > 0 ? 'progress' : null,
      counts.submissions > 0 ? 'submissions' : null,
      counts.remedials > 0 ? 'remedials' : null,
    ].filter(Boolean);

    if (blockers.length > 1) {
      return 'Kelas praktikum tidak dapat dihapus karena sudah memiliki data pembelajaran.';
    }
    if (blockers[0] === 'jobsheets') {
      return 'Kelas praktikum tidak dapat dihapus karena sudah memiliki jobsheet yang dipublish.';
    }
    if (blockers[0] === 'progress') {
      return 'Kelas praktikum tidak dapat dihapus karena sudah memiliki progress mahasiswa.';
    }
    if (blockers[0] === 'submissions') {
      return 'Kelas praktikum tidak dapat dihapus karena sudah memiliki submission atau hasil review mahasiswa.';
    }
    if (blockers[0] === 'remedials') {
      return 'Kelas praktikum tidak dapat dihapus karena sudah memiliki data pembelajaran.';
    }
    return null;
  }

  async _ensureUniqueTahunSemester(client, tahunSemester, ignoredId = null) {
    if (!tahunSemester) throw new Error('TAHUN_SEMESTER_REQUIRED');
    const params = [String(tahunSemester).trim().toLowerCase()];
    const ignoredClause = ignoredId ? ' AND id <> $2' : '';
    if (ignoredId) params.push(ignoredId);
    const result = await client.query(
      `SELECT 1 FROM tahun_semester WHERE LOWER(tahun_semester) = $1${ignoredClause} LIMIT 1`,
      params,
    );
    if (result.rows.length) throw new Error('TAHUN_SEMESTER_DUPLICATE');
  }

  async getTahunSemester() {
    const result = await this._pool.query(`
      SELECT id, tahun_semester, status, created_at, updated_at
      FROM tahun_semester
      ORDER BY created_at ASC, id ASC
    `);
    return result.rows;
  }

  async createTahunSemester(payload) {
    const id = payload.id || createId('ts');
    const status = normalizeSimpleStatus(payload.status);
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureUniqueTahunSemester(client, payload.tahun_semester);
      if (status === 'active') await client.query("UPDATE tahun_semester SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
      await client.query(
        `INSERT INTO tahun_semester (id, tahun_semester, status)
         VALUES ($1, $2, $3)`,
        [id, payload.tahun_semester, status],
      );
      await client.query('COMMIT');
      return (await this.getTahunSemester()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('TAHUN_SEMESTER_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTahunSemester(id, payload) {
    const status = payload.status ? normalizeSimpleStatus(payload.status) : null;
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'tahun_semester', id, 'TAHUN_SEMESTER_NOT_FOUND');
      if (payload.tahun_semester) await this._ensureUniqueTahunSemester(client, payload.tahun_semester, id);
      if (status === 'active') await client.query("UPDATE tahun_semester SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active' AND id <> $1", [id]);
      await client.query(
        `UPDATE tahun_semester
         SET tahun_semester = COALESCE($2, tahun_semester),
             status = COALESCE($3, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.tahun_semester || null, status],
      );
      await client.query('COMMIT');
      return (await this.getTahunSemester()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('TAHUN_SEMESTER_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async activateTahunSemester(id) {
    return this.updateTahunSemester(id, { status: 'active' });
  }

  async deleteTahunSemester(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        
        // Find all kelas_semester
        const ksRes = await client.query('SELECT id FROM kelas_semester WHERE id_tahun_semester = $1', [id]);
        const ksIds = ksRes.rows.map(r => r.id);
        
        // Find all kelas_mhs
        const kmRes = await client.query('SELECT id FROM kelas_mhs WHERE id_tahun_semester = $1', [id]);
        const kmIds = kmRes.rows.map(r => r.id);
        
        // Find all kelas_praktikum
        const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_tahun_semester = $1', [id]);
        const kpIds = kpRes.rows.map(r => r.id);
        
        // Cascade delete for kelas_mhs
        if (kmIds.length > 0) {
          await client.query('DELETE FROM student_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM kelas_mhs WHERE id_tahun_semester = $1', [id]);
        }
        
        // Cascade delete for kelas_praktikum
        if (kpIds.length > 0) {
          await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM kelas_praktikum WHERE id_tahun_semester = $1', [id]);
        }
        
        // Delete kelas_semester
        await client.query('DELETE FROM kelas_semester WHERE id_tahun_semester = $1', [id]);
        
        // Delete tahun_semester
        const result = await client.query('DELETE FROM tahun_semester WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('TAHUN_SEMESTER_NOT_FOUND');
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('kelas_semester', 'id_tahun_semester', id, 'TAHUN_SEMESTER_USED');
      await this._ensureUnused('kelas_mhs', 'id_tahun_semester', id, 'TAHUN_SEMESTER_USED');
      await this._ensureUnused('kelas_praktikum', 'id_tahun_semester', id, 'TAHUN_SEMESTER_USED');
      await this._ensureNoRows(
        `SELECT 1
         FROM student_progress sp
         JOIN kelas_praktikum kp ON kp.id = sp.id_kelas_praktikum
         WHERE kp.id_tahun_semester = $1
         LIMIT 1`,
        [id],
        'TAHUN_SEMESTER_USED',
      );
      await this._ensureNoRows(
        `SELECT 1
         FROM task_submissions ts
         JOIN kelas_praktikum kp ON kp.id = ts.id_kelas_praktikum
         WHERE kp.id_tahun_semester = $1
         LIMIT 1`,
        [id],
        'TAHUN_SEMESTER_USED',
      );
      const result = await this._pool.query('DELETE FROM tahun_semester WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('TAHUN_SEMESTER_NOT_FOUND');
    }
  }

  async getKurikulum() {
    const result = await this._pool.query(`
      SELECT id, tahun_kurikulum, nama_kurikulum, status, created_at, updated_at
      FROM kurikulum
      ORDER BY status = 'active' DESC, tahun_kurikulum DESC, nama_kurikulum ASC
    `);
    return result.rows;
  }

  async createKurikulum(payload) {
    const id = payload.id || createId('kur');
    const status = normalizeSimpleStatus(payload.status);
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO kurikulum (id, tahun_kurikulum, nama_kurikulum, status)
         VALUES ($1, $2, $3, $4)`,
        [id, payload.tahun_kurikulum, payload.nama_kurikulum, status],
      );
      await client.query('COMMIT');
      return (await this.getKurikulum()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KURIKULUM_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateKurikulum(id, payload) {
    const status = payload.status ? normalizeSimpleStatus(payload.status) : null;
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'kurikulum', id, 'KURIKULUM_NOT_FOUND');
      await client.query(
        `UPDATE kurikulum
         SET tahun_kurikulum = COALESCE($2, tahun_kurikulum),
             nama_kurikulum = COALESCE($3, nama_kurikulum),
             status = COALESCE($4, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.tahun_kurikulum || null, payload.nama_kurikulum || null, status],
      );
      await client.query('COMMIT');
      return (await this.getKurikulum()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KURIKULUM_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async activateKurikulum(id) {
    return this.updateKurikulum(id, { status: 'active' });
  }

  async deleteKurikulum(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        const mkRes = await client.query('SELECT id FROM mata_kuliah WHERE id_kurikulum = $1', [id]);
        const mkIds = mkRes.rows.map(r => r.id);
        if (mkIds.length > 0) {
          // Find all kelas_praktikum for these courses
          const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          const kpIds = kpRes.rows.map(r => r.id);
          if (kpIds.length > 0) {
            await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
            await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
            await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
            await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
            await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
            await client.query('DELETE FROM kelas_praktikum WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          }
          // Delete jobsheets for these courses
          const jRes = await client.query('SELECT id FROM jobsheets WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          const jIds = jRes.rows.map(r => r.id);
          if (jIds.length > 0) {
            await client.query('DELETE FROM experiments WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM exercises WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM jobsheet_classes WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM student_progress WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM task_submissions WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM student_jobsheet_progress WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM jobsheets WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          }
          await client.query('DELETE FROM mata_kuliah WHERE id_kurikulum = $1', [id]);
        }
        const result = await client.query('DELETE FROM kurikulum WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('KURIKULUM_NOT_FOUND');
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('mata_kuliah', 'id_kurikulum', id, 'KURIKULUM_USED');
      const result = await this._pool.query('DELETE FROM kurikulum WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('KURIKULUM_NOT_FOUND');
    }
  }

  async getSemester() {
    const result = await this._pool.query('SELECT id, semester, created_at, updated_at FROM semester ORDER BY semester ASC');
    return result.rows;
  }

  async createSemester(payload) {
    const id = payload.id || createId('sem');
    try {
      await this._pool.query('INSERT INTO semester (id, semester) VALUES ($1, $2)', [id, Number(payload.semester)]);
      return (await this.getSemester()).find((item) => item.id === id);
    } catch (error) {
      if (error.code === '23505') throw new Error('MASTER_SEMESTER_DUPLICATE');
      throw error;
    }
  }

  async updateSemester(id, payload) {
    try {
      const result = await this._pool.query(
        'UPDATE semester SET semester = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id, Number(payload.semester)],
      );
      if (!result.rows.length) throw new Error('MASTER_SEMESTER_NOT_FOUND');
      return (await this.getSemester()).find((item) => item.id === id);
    } catch (error) {
      if (error.code === '23505') throw new Error('MASTER_SEMESTER_DUPLICATE');
      throw error;
    }
  }

  async deleteSemester(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        
        // Find all kelas_mhs
        const kmRes = await client.query('SELECT id FROM kelas_mhs WHERE id_semester = $1', [id]);
        const kmIds = kmRes.rows.map(r => r.id);
        if (kmIds.length > 0) {
          await client.query('DELETE FROM student_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM kelas_mhs WHERE id_semester = $1', [id]);
        }

        // Find all kelas_praktikum
        const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_semester = $1', [id]);
        const kpIds = kpRes.rows.map(r => r.id);
        if (kpIds.length > 0) {
          await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM kelas_praktikum WHERE id_semester = $1', [id]);
        }

        // Find all mata_kuliah on this semester
        const mkRes = await client.query('SELECT id FROM mata_kuliah WHERE id_semester = $1', [id]);
        const mkIds = mkRes.rows.map(r => r.id);
        if (mkIds.length > 0) {
          // Delete jobsheets for these courses
          const jRes = await client.query('SELECT id FROM jobsheets WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          const jIds = jRes.rows.map(r => r.id);
          if (jIds.length > 0) {
            await client.query('DELETE FROM experiments WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM exercises WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM jobsheet_classes WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM student_progress WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM task_submissions WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM student_jobsheet_progress WHERE jobsheet_id = ANY($1)', [jIds]);
            await client.query('DELETE FROM jobsheets WHERE id_mata_kuliah = ANY($1)', [mkIds]);
          }
          await client.query('DELETE FROM mata_kuliah WHERE id_semester = $1', [id]);
        }

        // Delete kelas_semester
        await client.query('DELETE FROM kelas_semester WHERE id_semester = $1', [id]);

        // Delete master semester
        const result = await client.query('DELETE FROM semester WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('MASTER_SEMESTER_NOT_FOUND');

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('mata_kuliah', 'id_semester', id, 'MASTER_SEMESTER_USED');
      await this._ensureUnused('kelas_semester', 'id_semester', id, 'MASTER_SEMESTER_USED');
      await this._ensureUnused('kelas_mhs', 'id_semester', id, 'MASTER_SEMESTER_USED');
      await this._ensureUnused('kelas_praktikum', 'id_semester', id, 'MASTER_SEMESTER_USED');
      const result = await this._pool.query('DELETE FROM semester WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('MASTER_SEMESTER_NOT_FOUND');
    }
  }

  async getKelas() {
    const result = await this._pool.query('SELECT id, kelas, created_at, updated_at FROM kelas ORDER BY kelas ASC');
    return result.rows;
  }

  async createKelas(payload) {
    const id = payload.id || createId('kls');
    try {
      await this._pool.query('INSERT INTO kelas (id, kelas) VALUES ($1, $2)', [id, normalizeClassName(payload.kelas)]);
      return (await this.getKelas()).find((item) => item.id === id);
    } catch (error) {
      if (error.code === '23505') throw new Error('MASTER_KELAS_DUPLICATE');
      throw error;
    }
  }

  async updateKelas(id, payload) {
    try {
      const result = await this._pool.query(
        'UPDATE kelas SET kelas = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id, normalizeClassName(payload.kelas)],
      );
      if (!result.rows.length) throw new Error('MASTER_KELAS_NOT_FOUND');
      return (await this.getKelas()).find((item) => item.id === id);
    } catch (error) {
      if (error.code === '23505') throw new Error('MASTER_KELAS_DUPLICATE');
      throw error;
    }
  }

  async deleteKelas(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        
        // Find all kelas_mhs
        const kmRes = await client.query('SELECT id FROM kelas_mhs WHERE id_kelas = $1', [id]);
        const kmIds = kmRes.rows.map(r => r.id);
        if (kmIds.length > 0) {
          await client.query('DELETE FROM student_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_mhs = ANY($1)', [kmIds]);
          await client.query('DELETE FROM kelas_mhs WHERE id_kelas = $1', [id]);
        }

        // Find all kelas_praktikum
        const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_kelas = $1', [id]);
        const kpIds = kpRes.rows.map(r => r.id);
        if (kpIds.length > 0) {
          await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM kelas_praktikum WHERE id_kelas = $1', [id]);
        }

        // Delete kelas_semester
        await client.query('DELETE FROM kelas_semester WHERE id_kelas = $1', [id]);

        // Delete master kelas
        const result = await client.query('DELETE FROM kelas WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('MASTER_KELAS_NOT_FOUND');

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('kelas_semester', 'id_kelas', id, 'MASTER_KELAS_USED');
      await this._ensureUnused('kelas_mhs', 'id_kelas', id, 'MASTER_KELAS_USED');
      await this._ensureUnused('kelas_praktikum', 'id_kelas', id, 'MASTER_KELAS_USED');
      const result = await this._pool.query('DELETE FROM kelas WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('MASTER_KELAS_NOT_FOUND');
    }
  }

  async getMataKuliah(filters = {}) {
    const params = [];
    let where = 'WHERE true';
    if (filters.id_kurikulum) {
      params.push(filters.id_kurikulum);
      where += ` AND mk.id_kurikulum = $${params.length}`;
    }
    if (filters.id_semester) {
      params.push(filters.id_semester);
      where += ` AND mk.id_semester = $${params.length}`;
    }
    if (filters.semester_parity === 'ganjil' || filters.semester_parity === 'odd') {
      where += ' AND MOD(s.semester, 2) = 1';
    }
    if (filters.semester_parity === 'genap' || filters.semester_parity === 'even') {
      where += ' AND MOD(s.semester, 2) = 0';
    }
    const result = await this._pool.query(`
      SELECT mk.*, k.nama_kurikulum, s.semester
      FROM mata_kuliah mk
      JOIN kurikulum k ON k.id = mk.id_kurikulum
      JOIN semester s ON s.id = mk.id_semester
      ${where}
      ORDER BY s.semester ASC, mk.nama_mk ASC
    `, params);
    return result.rows;
  }

  async createMataKuliah(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('mkb');
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'kurikulum', payload.id_kurikulum, 'KURIKULUM_NOT_FOUND');
      await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      await client.query(
        `INSERT INTO mata_kuliah (id, kode_mk, nama_mk, sks, tipe, id_kurikulum, id_semester)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, payload.kode_mk, payload.nama_mk, Number(payload.sks), normalizeCourseType(payload.tipe), payload.id_kurikulum, payload.id_semester],
      );
      await client.query('COMMIT');
      return (await this.getMataKuliah()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('MATA_KULIAH_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMataKuliah(id, payload) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'mata_kuliah', id, 'MATA_KULIAH_NOT_FOUND');
      if (payload.id_kurikulum) await this._ensureExists(client, 'kurikulum', payload.id_kurikulum, 'KURIKULUM_NOT_FOUND');
      if (payload.id_semester) await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      await client.query(
        `UPDATE mata_kuliah
         SET kode_mk = COALESCE($2, kode_mk),
             nama_mk = COALESCE($3, nama_mk),
             sks = COALESCE($4, sks),
             tipe = COALESCE($5, tipe),
             id_kurikulum = COALESCE($6, id_kurikulum),
             id_semester = COALESCE($7, id_semester),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          id,
          payload.kode_mk || null,
          payload.nama_mk || null,
          payload.sks ? Number(payload.sks) : null,
          payload.tipe ? normalizeCourseType(payload.tipe) : null,
          payload.id_kurikulum || null,
          payload.id_semester || null,
        ],
      );
      await client.query('COMMIT');
      return (await this.getMataKuliah()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('MATA_KULIAH_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMataKuliah(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        // Find all kelas_praktikum for this mata_kuliah
        const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_mata_kuliah = $1', [id]);
        const kpIds = kpRes.rows.map(r => r.id);
        if (kpIds.length > 0) {
          await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM kelas_praktikum WHERE id_mata_kuliah = $1', [id]);
        }
        // Delete jobsheets for this mata_kuliah
        const jRes = await client.query('SELECT id FROM jobsheets WHERE id_mata_kuliah = $1', [id]);
        const jIds = jRes.rows.map(r => r.id);
        if (jIds.length > 0) {
          await client.query('DELETE FROM experiments WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM exercises WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM jobsheet_classes WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM student_progress WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM task_submissions WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE jobsheet_id = ANY($1)', [jIds]);
          await client.query('DELETE FROM jobsheets WHERE id_mata_kuliah = $1', [id]);
        }
        const result = await client.query('DELETE FROM mata_kuliah WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('MATA_KULIAH_NOT_FOUND');
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('kelas_praktikum', 'id_mata_kuliah', id, 'MATA_KULIAH_USED');
      await this._ensureUnused('jobsheets', 'id_mata_kuliah', id, 'MATA_KULIAH_USED');
      const result = await this._pool.query('DELETE FROM mata_kuliah WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('MATA_KULIAH_NOT_FOUND');
    }
  }



  async getKelasMahasiswa(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let clause = '';
    ['id_tahun_semester', 'id_semester', 'id_kelas', 'id_kelas_semester'].forEach((key) => {
      if (filters[key]) {
        params.push(filters[key]);
        clause += ` AND km.${key} = $${params.length}`;
      }
    });
    const result = await this._pool.query(`
      SELECT km.*, ts.tahun_semester, s.semester, k.kelas,
        u.fullname, u.email, sp.nim, sp.semester AS student_semester, sp.status AS student_status
      FROM kelas_mhs km
      JOIN tahun_semester ts ON ts.id = km.id_tahun_semester
      JOIN semester s ON s.id = km.id_semester
      JOIN kelas k ON k.id = km.id_kelas
      JOIN users u ON u.id = km.id_mahasiswa
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(COALESCE(sp.nim, '')) LIKE $1)
      ${clause}
      ORDER BY ts.tahun_semester DESC, COALESCE(sp.semester, s.semester) ASC, k.kelas ASC, sp.nim ASC
    `, params);
    return result.rows.map((row) => ({
      ...row,
      student_semester: row.student_semester ?? row.semester,
    }));
  }

  async createKelasMahasiswa(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('km');
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'tahun_semester', payload.id_tahun_semester, 'TAHUN_SEMESTER_NOT_FOUND');
      await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      await this._ensureExists(client, 'kelas', payload.id_kelas, 'MASTER_KELAS_NOT_FOUND');
      await this._ensureExists(client, 'users', payload.id_mahasiswa, 'MAHASISWA_NOT_FOUND', 'MAHASISWA');
      await this._validateStudentClassEligibility(client, {
        studentId: payload.id_mahasiswa,
        tahunSemesterId: payload.id_tahun_semester,
        semesterId: payload.id_semester,
        kelasId: payload.id_kelas,
      });

      // Fetch or automatically create the corresponding kelas_semester group
      const groupResult = await client.query(
        'SELECT id FROM kelas_semester WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
        [payload.id_tahun_semester, payload.id_semester, payload.id_kelas]
      );
      let id_kelas_semester = groupResult.rows[0]?.id || null;
      if (!id_kelas_semester) {
        id_kelas_semester = createId('ks');
        await client.query(
          `INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_kelas_semester, payload.id_tahun_semester, payload.id_semester, payload.id_kelas, 'active']
        );
      }

      await client.query(
        `INSERT INTO kelas_mhs (id, id_tahun_semester, id_semester, id_kelas, id_mahasiswa, status, id_kelas_semester)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, payload.id_tahun_semester, payload.id_semester, payload.id_kelas, payload.id_mahasiswa, normalizeSimpleStatus(payload.status, 'active'), id_kelas_semester],
      );
      await client.query('COMMIT');
      return (await this.getKelasMahasiswa()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_MAHASISWA_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateKelasMahasiswa(id, payload) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'kelas_mhs', id, 'KELAS_MAHASISWA_NOT_FOUND');
      if (payload.id_tahun_semester) await this._ensureExists(client, 'tahun_semester', payload.id_tahun_semester, 'TAHUN_SEMESTER_NOT_FOUND');
      if (payload.id_semester) await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      if (payload.id_kelas) await this._ensureExists(client, 'kelas', payload.id_kelas, 'MASTER_KELAS_NOT_FOUND');
      if (payload.id_mahasiswa) await this._ensureExists(client, 'users', payload.id_mahasiswa, 'MAHASISWA_NOT_FOUND', 'MAHASISWA');
      if (payload.id_tahun_semester || payload.id_semester || payload.id_kelas || payload.id_mahasiswa) {
        const currentRes = await client.query('SELECT * FROM kelas_mhs WHERE id = $1 LIMIT 1', [id]);
        const current = currentRes.rows[0];
        await this._validateStudentClassEligibility(client, {
          studentId: payload.id_mahasiswa || current.id_mahasiswa,
          tahunSemesterId: payload.id_tahun_semester || current.id_tahun_semester,
          semesterId: payload.id_semester || current.id_semester,
          kelasId: payload.id_kelas || current.id_kelas,
          ignoredKelasMahasiswaId: id,
        });
      }

      // Resolve id_kelas_semester if fields changed
      let id_kelas_semester = undefined;
      if (payload.id_tahun_semester || payload.id_semester || payload.id_kelas) {
        const currentRes = await client.query('SELECT * FROM kelas_mhs WHERE id = $1 LIMIT 1', [id]);
        const current = currentRes.rows[0];
        const targetTahun = payload.id_tahun_semester || current.id_tahun_semester;
        const targetSemester = payload.id_semester || current.id_semester;
        const targetKelas = payload.id_kelas || current.id_kelas;

        const groupResult = await client.query(
          'SELECT id FROM kelas_semester WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
          [targetTahun, targetSemester, targetKelas]
        );
        id_kelas_semester = groupResult.rows[0]?.id || null;
        if (!id_kelas_semester) {
          id_kelas_semester = createId('ks');
          await client.query(
            `INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_kelas_semester, targetTahun, targetSemester, targetKelas, 'active']
          );
        }
      }

      await client.query(
        `UPDATE kelas_mhs
         SET id_tahun_semester = COALESCE($2, id_tahun_semester),
             id_semester = COALESCE($3, id_semester),
             id_kelas = COALESCE($4, id_kelas),
             id_mahasiswa = COALESCE($5, id_mahasiswa),
             status = COALESCE($6, status),
             id_kelas_semester = COALESCE($7, id_kelas_semester),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.id_tahun_semester || null, payload.id_semester || null, payload.id_kelas || null, payload.id_mahasiswa || null, payload.status ? normalizeSimpleStatus(payload.status, 'active') : null, id_kelas_semester || null],
      );
      await client.query('COMMIT');
      return (await this.getKelasMahasiswa()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_MAHASISWA_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteKelasMahasiswa(id, force = false) {
    force = false;
    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM student_progress WHERE id_kelas_mhs = $1', [id]);
        await client.query('DELETE FROM task_submissions WHERE id_kelas_mhs = $1', [id]);
        await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_mhs = $1', [id]);
        const result = await client.query('DELETE FROM kelas_mhs WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) throw new Error('KELAS_MAHASISWA_NOT_FOUND');
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this._ensureUnused('student_progress', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
      await this._ensureUnused('task_submissions', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
      await this._ensureUnused('student_jobsheet_progress', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
      const result = await this._pool.query('DELETE FROM kelas_mhs WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('KELAS_MAHASISWA_NOT_FOUND');
    }
  }

  async _getSemesterNumber(client, semesterId) {
    const result = await client.query('SELECT semester FROM semester WHERE id = $1 LIMIT 1', [semesterId]);
    if (!result.rows.length) throw new Error('MASTER_SEMESTER_NOT_FOUND');
    return Number(result.rows[0].semester);
  }

  async _validateStudentClassEligibility(client, {
    studentId,
    tahunSemesterId,
    semesterId,
    kelasId,
    ignoredKelasMahasiswaId = null,
  }) {
    const semesterNum = await this._getSemesterNumber(client, semesterId);
    const student = await client.query(`
      SELECT u.id, u.is_active, sp.semester, sp.status
      FROM users u
      JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'MAHASISWA'
      LIMIT 1
    `, [studentId]);
    if (!student.rows.length) throw new Error('MAHASISWA_NOT_FOUND');

    const row = student.rows[0];
    const status = String(row.status || '').toLowerCase();
    if (!row.is_active || status !== 'aktif') throw new Error('MAHASISWA_NOT_ACTIVE');
    if (Number(row.semester) !== semesterNum) throw new Error('STUDENT_SEMESTER_MISMATCH');

    const params = [tahunSemesterId, studentId];
    let ignoredClause = '';
    if (ignoredKelasMahasiswaId) {
      params.push(ignoredKelasMahasiswaId);
      ignoredClause = ` AND id <> $${params.length}`;
    }
    const periodDuplicate = await client.query(
      `SELECT 1 FROM kelas_mhs WHERE id_tahun_semester = $1 AND id_mahasiswa = $2${ignoredClause} LIMIT 1`,
      params,
    );
    if (periodDuplicate.rows.length) throw new Error('KELAS_MAHASISWA_DUPLICATE');

    const sameClass = await client.query(`
      SELECT 1
      FROM kelas_mhs
      WHERE id_tahun_semester = $1
        AND id_semester = $2
        AND id_kelas = $3
        AND id_mahasiswa = $4
        ${ignoredKelasMahasiswaId ? 'AND id <> $5' : ''}
      LIMIT 1
    `, ignoredKelasMahasiswaId
      ? [tahunSemesterId, semesterId, kelasId, studentId, ignoredKelasMahasiswaId]
      : [tahunSemesterId, semesterId, kelasId, studentId]);
    if (sameClass.rows.length) throw new Error('KELAS_MAHASISWA_DUPLICATE');
  }

  async transitionStudents(payload) {
    const { targetTahunSemesterId, transitions } = payload;
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'tahun_semester', targetTahunSemesterId, 'TAHUN_SEMESTER_NOT_FOUND');

      const prepared = [];
      for (const t of transitions) {
        const { studentId, action, targetSemesterId, targetKelasId, transferException, transferReason } = t;
        if (action !== 'promote') throw new Error('STUDENT_PROMOTION_ACTION_INVALID');
        if (!targetSemesterId || !targetKelasId) throw new Error('STUDENT_PROMOTION_TARGET_REQUIRED');

        const studentRes = await client.query(`
          SELECT u.id, u.is_active, sp.semester, sp.status, sp.is_transfer_student
          FROM users u
          JOIN student_profiles sp ON sp.user_id = u.id
          WHERE u.id = $1 AND u.role = 'MAHASISWA'
          LIMIT 1
        `, [studentId]);
        if (!studentRes.rows.length) throw new Error('MAHASISWA_NOT_FOUND');
        const student = studentRes.rows[0];
        if (!student.is_active || String(student.status || '').toLowerCase() !== 'aktif') {
          throw new Error('MAHASISWA_NOT_ACTIVE');
        }

        const current = await client.query(`
          SELECT km.*, s.semester AS relation_semester
          FROM kelas_mhs km
          JOIN semester s ON s.id = km.id_semester
          WHERE km.id_mahasiswa = $1
          ORDER BY km.created_at DESC
          LIMIT 1
        `, [studentId]);
        if (!current.rows.length) throw new Error('STUDENT_HISTORY_REQUIRED');

        const targetSemesterNum = await this._getSemesterNumber(client, targetSemesterId);
        const currentSemesterNum = Number(student.semester ?? current.rows[0].relation_semester);
        const isSequential = targetSemesterNum === currentSemesterNum + 1;
        if (!isSequential && !transferException) throw new Error('STUDENT_SEMESTER_JUMP_NOT_ALLOWED');
        if (!isSequential && !String(transferReason || '').trim()) throw new Error('TRANSFER_REASON_REQUIRED');

        await this._ensureExists(client, 'kelas', targetKelasId, 'MASTER_KELAS_NOT_FOUND');
        const targetClass = await client.query(
          'SELECT id FROM kelas_semester WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
          [targetTahunSemesterId, targetSemesterId, targetKelasId],
        );
        if (!targetClass.rows.length) throw new Error('KELAS_SEMESTER_TARGET_NOT_FOUND');

        const duplicate = await client.query(
          'SELECT 1 FROM kelas_mhs WHERE id_tahun_semester = $1 AND id_mahasiswa = $2 LIMIT 1',
          [targetTahunSemesterId, studentId],
        );
        if (duplicate.rows.length) throw new Error('KELAS_MAHASISWA_DUPLICATE');

        prepared.push({
          ...t,
          current: current.rows[0],
          currentSemesterNum,
          targetSemesterNum,
          targetClassId: targetClass.rows[0].id,
        });
      }

      for (const item of prepared) {
        await client.query(
          `UPDATE student_profiles
           SET semester = $2,
               is_transfer_student = CASE WHEN $3 THEN true ELSE is_transfer_student END,
               transfer_origin_semester = CASE WHEN $3 THEN $4 ELSE transfer_origin_semester END,
               transfer_reason = CASE WHEN $3 THEN $5 ELSE transfer_reason END
           WHERE user_id = $1`,
          [item.studentId, item.targetSemesterNum, Boolean(item.transferException), item.currentSemesterNum, item.transferReason || null],
        );

        const kmId = createId('km');
        await client.query(
          `INSERT INTO kelas_mhs (id, id_tahun_semester, id_semester, id_kelas, id_mahasiswa, status, id_kelas_semester)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
          [kmId, targetTahunSemesterId, item.targetSemesterId, item.targetKelasId, item.studentId, item.targetClassId],
        );

        await client.query(
          `INSERT INTO student_class_history (
             id, id_mahasiswa, from_kelas_mhs_id, to_kelas_mhs_id,
             from_tahun_semester_id, to_tahun_semester_id,
             from_semester, to_semester, from_kelas_id, to_kelas_id, action, note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            createId('sch'),
            item.studentId,
            item.current.id,
            kmId,
            item.current.id_tahun_semester,
            targetTahunSemesterId,
            item.currentSemesterNum,
            item.targetSemesterNum,
            item.current.id_kelas,
            item.targetKelasId,
            item.transferException ? 'transfer_exception' : 'promote',
            item.transferReason || null,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  _buildKelasPraktikumName(row) {
    return `${row.nama_mk} - Semester ${row.semester} - Kelas ${row.kelas} - ${row.tahun_semester}`;
  }

  async getKelasPraktikum(filters = {}) {
    const params = [];
    let clause = 'WHERE true';
    if (filters.id_dosen) {
      params.push(filters.id_dosen);
      clause += ` AND EXISTS (SELECT 1 FROM pengampu p WHERE p.id_kelas_praktikum = kp.id AND p.id_dosen = $${params.length})`;
    }
    const result = await this._pool.query(`
      SELECT kp.*, ts.tahun_semester, mk.nama_mk, mk.kode_mk, mk.id_kurikulum, s.semester, k.kelas
      FROM kelas_praktikum kp
      JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN semester s ON s.id = kp.id_semester
      JOIN kelas k ON k.id = kp.id_kelas
      ${clause}
      ORDER BY ts.tahun_semester DESC, mk.nama_mk ASC, s.semester ASC, k.kelas ASC
    `, params);
    return result.rows;
  }



  async getKelasPraktikumById(id) {
    const item = (await this.getKelasPraktikum()).find((row) => row.id === id);
    if (!item) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');
    return item;
  }

  async createKelasPraktikum(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('kp');
    try {
      await client.query('BEGIN');
      const related = await client.query(`
        SELECT ts.id AS id_tahun_semester, ts.tahun_semester,
          mk.id AS id_mata_kuliah, mk.nama_mk, mk.tipe, mk.id_semester AS mk_id_semester, mk.id_kurikulum,
          s.id AS id_semester, s.semester, k.id AS id_kelas, k.kelas
        FROM tahun_semester ts, mata_kuliah mk
        JOIN semester s ON s.id = COALESCE($3::varchar, mk.id_semester)
        JOIN kelas k ON k.id = $4
        WHERE ts.id = $1 AND mk.id = $2
        LIMIT 1
      `, [payload.id_tahun_semester, payload.id_mata_kuliah, payload.id_semester || null, payload.id_kelas]);
      if (!related.rows.length) throw new Error('KELAS_PRAKTIKUM_REFERENCE_NOT_FOUND');
      const row = related.rows[0];
      const idSemester = payload.id_semester || row.mk_id_semester;
      if (payload.id_kurikulum && payload.id_kurikulum !== row.id_kurikulum) throw new Error('KELAS_PRAKTIKUM_KURIKULUM_MISMATCH');
      if (idSemester !== row.mk_id_semester) throw new Error('KELAS_PRAKTIKUM_SEMESTER_MISMATCH');
      const status = normalizeClassStatus(payload.status);
      const namaKelas = this._buildKelasPraktikumName({ ...row, id_semester: idSemester });
      await client.query(
        `INSERT INTO kelas_praktikum (id, id_tahun_semester, id_mata_kuliah, id_semester, id_kelas, nama_kelas, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, payload.id_tahun_semester, payload.id_mata_kuliah, idSemester, payload.id_kelas, namaKelas, status],
      );
      await client.query('COMMIT');
      return this.getKelasPraktikumById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_PRAKTIKUM_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateKelasPraktikum(id, payload) {
    const current = await this.getKelasPraktikumById(id);
    const next = {
      id_tahun_semester: payload.id_tahun_semester || current.id_tahun_semester,
      id_mata_kuliah: payload.id_mata_kuliah || current.id_mata_kuliah,
      id_semester: payload.id_semester || current.id_semester,
      id_kelas: payload.id_kelas || current.id_kelas,
    };
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const related = await client.query(`
        SELECT ts.tahun_semester, mk.nama_mk, mk.id_semester AS mk_id_semester, mk.id_kurikulum, s.semester, k.kelas
        FROM tahun_semester ts, mata_kuliah mk, semester s, kelas k
        WHERE ts.id = $1 AND mk.id = $2 AND s.id = $3 AND k.id = $4
        LIMIT 1
      `, [next.id_tahun_semester, next.id_mata_kuliah, next.id_semester, next.id_kelas]);
      if (!related.rows.length) throw new Error('KELAS_PRAKTIKUM_REFERENCE_NOT_FOUND');
      if (payload.id_kurikulum && payload.id_kurikulum !== related.rows[0].id_kurikulum) throw new Error('KELAS_PRAKTIKUM_KURIKULUM_MISMATCH');
      if (next.id_semester !== related.rows[0].mk_id_semester) throw new Error('KELAS_PRAKTIKUM_SEMESTER_MISMATCH');
      await client.query(
        `UPDATE kelas_praktikum
         SET id_tahun_semester = $2,
             id_mata_kuliah = $3,
             id_semester = $4,
             id_kelas = $5,
             nama_kelas = $6,
             status = COALESCE($7, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, next.id_tahun_semester, next.id_mata_kuliah, next.id_semester, next.id_kelas, this._buildKelasPraktikumName(related.rows[0]), payload.status ? normalizeClassStatus(payload.status) : null],
      );
      await client.query('COMMIT');
      return this.getKelasPraktikumById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_PRAKTIKUM_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteKelasPraktikumSafely(id) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const kelasResult = await client.query('SELECT id FROM kelas_praktikum WHERE id = $1 LIMIT 1', [id]);
      if (!kelasResult.rows.length) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');

      const jobsheets = await client.query('SELECT COUNT(*)::int AS total FROM jobsheet_classes WHERE id_kelas_praktikum = $1', [id]);
      const studentProgress = await client.query('SELECT COUNT(*)::int AS total FROM student_progress WHERE id_kelas_praktikum = $1', [id]);
      const jobsheetProgress = await client.query('SELECT COUNT(*)::int AS total FROM student_jobsheet_progress WHERE id_kelas_praktikum = $1', [id]);
      const submissions = await client.query(
        `SELECT COUNT(DISTINCT ts.id)::int AS total
         FROM task_submissions ts
         LEFT JOIN submission_reviews sr ON sr.submission_id = ts.id
         WHERE ts.id_kelas_praktikum = $1`,
        [id],
      );

      let remedialTotal = 0;
      if (await this._tableExists(client, 'jobsheet_remedials')) {
        const remedials = await client.query(
          'SELECT COUNT(*)::int AS total FROM jobsheet_remedials WHERE id_kelas_praktikum = $1',
          [id],
        );
        remedialTotal += remedials.rows[0].total;
      }
      if (
        await this._tableExists(client, 'jobsheet_remedial_students')
        && await this._tableExists(client, 'jobsheet_remedials')
      ) {
        const remedialStudents = await client.query(
          `SELECT COUNT(*)::int AS total
           FROM jobsheet_remedial_students jrs
           JOIN jobsheet_remedials jr ON jr.id = jrs.remedial_id
           WHERE jr.id_kelas_praktikum = $1`,
          [id],
        );
        remedialTotal += remedialStudents.rows[0].total;
      }

      const counts = {
        jobsheets: jobsheets.rows[0].total,
        progress: studentProgress.rows[0].total + jobsheetProgress.rows[0].total,
        submissions: submissions.rows[0].total,
        remedials: remedialTotal,
      };
      const message = this._kelasPraktikumDeleteMessage(counts);
      if (message) this._throwDeleteGuard(message);

      await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = $1', [id]);
      const result = await client.query('DELETE FROM kelas_praktikum WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteKelasPraktikum(id) {
    return this.deleteKelasPraktikumSafely(id);
  }

  async getKelasPraktikumMahasiswa(id) {
    const kelasPraktikum = await this.getKelasPraktikumById(id);
    const result = await this._pool.query(`
      SELECT km.*, u.fullname, u.email, sp.nim
      FROM kelas_mhs km
      JOIN users u ON u.id = km.id_mahasiswa
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE km.id_tahun_semester = $1
        AND km.id_semester = $2
        AND km.id_kelas = $3
      ORDER BY sp.nim ASC
    `, [kelasPraktikum.id_tahun_semester, kelasPraktikum.id_semester, kelasPraktikum.id_kelas]);
    return result.rows;
  }

  async getPengampu(filters = {}) {
    const params = [];
    let clause = 'WHERE true';
    if (filters.id_dosen) {
      params.push(filters.id_dosen);
      clause += ` AND p.id_dosen = $${params.length}`;
    }
    if (filters.id_kelas_praktikum) {
      params.push(filters.id_kelas_praktikum);
      clause += ` AND p.id_kelas_praktikum = $${params.length}`;
    }
    const result = await this._pool.query(`
      SELECT p.*, u.fullname AS nama_dosen, lp.nip, kp.nama_kelas
      FROM pengampu p
      JOIN users u ON u.id = p.id_dosen
      LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
      JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
      ${clause}
      ORDER BY kp.nama_kelas ASC, p.peran ASC, u.fullname ASC
    `, params);
    return result.rows;
  }

  async createPengampu(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('png');
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'kelas_praktikum', payload.id_kelas_praktikum, 'KELAS_PRAKTIKUM_NOT_FOUND');
      await this._ensureExists(client, 'users', payload.id_dosen, 'DOSEN_NOT_FOUND', 'DOSEN');
      await client.query(
        `INSERT INTO pengampu (id, id_kelas_praktikum, id_dosen, peran)
         VALUES ($1, $2, $3, $4)`,
        [id, payload.id_kelas_praktikum, payload.id_dosen, normalizeRole(payload.peran)],
      );
      await client.query('COMMIT');
      return (await this.getPengampu()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('PENGAMPU_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePengampu(id, payload) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'pengampu', id, 'PENGAMPU_NOT_FOUND');
      if (payload.id_kelas_praktikum) await this._ensureExists(client, 'kelas_praktikum', payload.id_kelas_praktikum, 'KELAS_PRAKTIKUM_NOT_FOUND');
      if (payload.id_dosen) await this._ensureExists(client, 'users', payload.id_dosen, 'DOSEN_NOT_FOUND', 'DOSEN');
      await client.query(
        `UPDATE pengampu
         SET id_kelas_praktikum = COALESCE($2, id_kelas_praktikum),
             id_dosen = COALESCE($3, id_dosen),
             peran = COALESCE($4, peran),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.id_kelas_praktikum || null, payload.id_dosen || null, payload.peran ? normalizeRole(payload.peran) : null],
      );
      await client.query('COMMIT');
      return (await this.getPengampu()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('PENGAMPU_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePengampu(id) {
    const result = await this._pool.query('DELETE FROM pengampu WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('PENGAMPU_NOT_FOUND');
  }

  async getKelasSemester(filters = {}) {
    const params = [];
    let clause = '';
    if (filters.id_tahun_semester) {
      params.push(filters.id_tahun_semester);
      clause += ` AND ks.id_tahun_semester = $${params.length}`;
    }
    const result = await this._pool.query(`
      SELECT 
        ks.id,
        ks.id_tahun_semester,
        ks.id_semester,
        ks.id_kelas,
        s.semester,
        k.kelas,
        (s.semester || k.kelas) AS nama_kelas,
        COUNT(km.id)::int AS jumlah_mahasiswa,
        ks.status,
        ts.tahun_semester
      FROM kelas_semester ks
      JOIN tahun_semester ts ON ts.id = ks.id_tahun_semester
      JOIN semester s ON s.id = ks.id_semester
      JOIN kelas k ON k.id = ks.id_kelas
      LEFT JOIN kelas_mhs km ON km.id_kelas_semester = ks.id
      WHERE true${clause}
      GROUP BY ks.id, s.semester, k.kelas, ts.tahun_semester
      ORDER BY s.semester ASC, k.kelas ASC
    `, params);
    return result.rows;
  }

  async getKelasSemesterById(id) {
    const result = await this._pool.query(`
      SELECT 
        ks.id,
        ks.id_tahun_semester,
        ks.id_semester,
        ks.id_kelas,
        s.semester,
        k.kelas,
        (s.semester || k.kelas) AS nama_kelas,
        ks.status,
        ts.tahun_semester
      FROM kelas_semester ks
      JOIN tahun_semester ts ON ts.id = ks.id_tahun_semester
      JOIN semester s ON s.id = ks.id_semester
      JOIN kelas k ON k.id = ks.id_kelas
      WHERE ks.id = $1
    `, [id]);
    if (!result.rows.length) throw new Error('KELAS_SEMESTER_NOT_FOUND');
    return result.rows[0];
  }

  async createKelasSemester(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('ks');
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'tahun_semester', payload.id_tahun_semester, 'TAHUN_SEMESTER_NOT_FOUND');
      await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      await this._ensureExists(client, 'kelas', payload.id_kelas, 'MASTER_KELAS_NOT_FOUND');
      await client.query(
        `INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, payload.id_tahun_semester, payload.id_semester, payload.id_kelas, normalizeSimpleStatus(payload.status, 'active')],
      );
      await client.query('COMMIT');
      return (await this.getKelasSemester()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_SEMESTER_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateKelasSemester(id, payload) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query('SELECT id_tahun_semester, id_semester, id_kelas FROM kelas_semester WHERE id = $1', [id]);
      if (!currentRes.rows.length) throw new Error('KELAS_SEMESTER_NOT_FOUND');
      const current = currentRes.rows[0];

      // Check if students exist
      const studentsCheck = await client.query('SELECT COUNT(id)::int AS count FROM kelas_mhs WHERE id_kelas_semester = $1', [id]);
      if (studentsCheck.rows[0].count > 0) {
        throw new Error('KELAS_SEMESTER_HAS_STUDENTS');
      }

      // Check if used by kelas_praktikum
      const praktikumCheck = await client.query(
        'SELECT 1 FROM kelas_praktikum WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
        [current.id_tahun_semester, current.id_semester, current.id_kelas]
      );
      if (praktikumCheck.rows.length > 0) {
        throw new Error('KELAS_SEMESTER_EDIT_USED_BY_PRAKTIKUM');
      }

      if (payload.id_tahun_semester) await this._ensureExists(client, 'tahun_semester', payload.id_tahun_semester, 'TAHUN_SEMESTER_NOT_FOUND');
      if (payload.id_semester) await this._ensureExists(client, 'semester', payload.id_semester, 'MASTER_SEMESTER_NOT_FOUND');
      if (payload.id_kelas) await this._ensureExists(client, 'kelas', payload.id_kelas, 'MASTER_KELAS_NOT_FOUND');
      await client.query(
        `UPDATE kelas_semester
         SET id_tahun_semester = COALESCE($2, id_tahun_semester),
             id_semester = COALESCE($3, id_semester),
             id_kelas = COALESCE($4, id_kelas),
             status = COALESCE($5, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.id_tahun_semester || null, payload.id_semester || null, payload.id_kelas || null, payload.status ? normalizeSimpleStatus(payload.status, 'active') : null],
      );
      await client.query('COMMIT');
      return (await this.getKelasSemester()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_SEMESTER_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteKelasSemesterSafely(id) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query('SELECT id_tahun_semester, id_semester, id_kelas FROM kelas_semester WHERE id = $1', [id]);
      if (!currentRes.rows.length) throw new Error('KELAS_SEMESTER_NOT_FOUND');
      const current = currentRes.rows[0];

      const studentsCheck = await client.query('SELECT COUNT(id)::int AS count FROM kelas_mhs WHERE id_kelas_semester = $1', [id]);
      if (studentsCheck.rows[0].count > 0) {
        this._throwDeleteGuard('Kelas tidak dapat dihapus karena masih memiliki mahasiswa.');
      }

      const praktikumCheck = await client.query(
        'SELECT 1 FROM kelas_praktikum WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
        [current.id_tahun_semester, current.id_semester, current.id_kelas]
      );
      if (praktikumCheck.rows.length > 0) {
        this._throwDeleteGuard('Kelas tidak dapat dihapus karena sudah digunakan oleh kelas praktikum.');
      }

      const result = await client.query('DELETE FROM kelas_semester WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) throw new Error('KELAS_SEMESTER_NOT_FOUND');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteKelasSemester(id) {
    return this.deleteKelasSemesterSafely(id);
  }
}

module.exports = AcademicDataService;
