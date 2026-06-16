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

  async getTahunSemester() {
    const result = await this._pool.query(`
      SELECT id, tahun_semester, status, created_at, updated_at
      FROM tahun_semester
      ORDER BY status = 'active' DESC, tahun_semester DESC
    `);
    return result.rows;
  }

  async createTahunSemester(payload) {
    const id = payload.id || createId('ts');
    const status = normalizeSimpleStatus(payload.status);
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
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

  async deleteTahunSemester(id) {
    await this._ensureUnused('kelas_mhs', 'id_tahun_semester', id, 'TAHUN_SEMESTER_USED');
    await this._ensureUnused('kelas_praktikum', 'id_tahun_semester', id, 'TAHUN_SEMESTER_USED');
    const result = await this._pool.query('DELETE FROM tahun_semester WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('TAHUN_SEMESTER_NOT_FOUND');
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
      if (status === 'active') await client.query("UPDATE kurikulum SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
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
      if (status === 'active') await client.query("UPDATE kurikulum SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active' AND id <> $1", [id]);
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

  async deleteKurikulum(id) {
    await this._ensureUnused('mata_kuliah', 'id_kurikulum', id, 'KURIKULUM_USED');
    const result = await this._pool.query('DELETE FROM kurikulum WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('KURIKULUM_NOT_FOUND');
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

  async deleteSemester(id) {
    await this._ensureUnused('mata_kuliah', 'id_semester', id, 'MASTER_SEMESTER_USED');
    await this._ensureUnused('kelas_mhs', 'id_semester', id, 'MASTER_SEMESTER_USED');
    await this._ensureUnused('kelas_praktikum', 'id_semester', id, 'MASTER_SEMESTER_USED');
    const result = await this._pool.query('DELETE FROM semester WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('MASTER_SEMESTER_NOT_FOUND');
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

  async deleteKelas(id) {
    await this._ensureUnused('kelas_mhs', 'id_kelas', id, 'MASTER_KELAS_USED');
    await this._ensureUnused('kelas_praktikum', 'id_kelas', id, 'MASTER_KELAS_USED');
    const result = await this._pool.query('DELETE FROM kelas WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('MASTER_KELAS_NOT_FOUND');
  }

  async getMataKuliah(filters = {}) {
    const params = [];
    let where = 'WHERE true';
    if (filters.id_kurikulum) {
      params.push(filters.id_kurikulum);
      where += ` AND mk.id_kurikulum = $${params.length}`;
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

  async deleteMataKuliah(id) {
    await this._ensureUnused('kelas_praktikum', 'id_mata_kuliah', id, 'MATA_KULIAH_USED');
    const result = await this._pool.query('DELETE FROM mata_kuliah WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('MATA_KULIAH_NOT_FOUND');
  }

  async getLegacyCourseLinkCandidates(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let statusClause = '';

    if (filters.status === 'linked') {
      statusClause = 'AND mk.id IS NOT NULL';
    } else if (filters.status === 'unlinked') {
      statusClause = 'AND mk.id IS NULL';
    }

    const result = await this._pool.query(
      `
      SELECT
        c.id AS legacy_course_id,
        c.name AS legacy_course_name,
        c.code AS legacy_course_code,
        c.semester AS legacy_course_semester,
        c.sks AS legacy_course_sks,
        c.status AS legacy_course_status,
        mk.id AS id_mata_kuliah,
        mk.kode_mk,
        mk.nama_mk,
        mk.tipe,
        k.id AS id_kurikulum,
        k.nama_kurikulum,
        COALESCE(suggestions.items, '[]'::json) AS suggested_mata_kuliah
      FROM courses c
      LEFT JOIN mata_kuliah mk ON mk.legacy_course_id = c.id
      LEFT JOIN kurikulum k ON k.id = mk.id_kurikulum
      LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(candidate)) AS items
        FROM (
          SELECT
            mk2.id,
            mk2.kode_mk,
            mk2.nama_mk,
            mk2.tipe,
            s.semester,
            kur.nama_kurikulum
          FROM mata_kuliah mk2
          JOIN semester s ON s.id = mk2.id_semester
          JOIN kurikulum kur ON kur.id = mk2.id_kurikulum
          WHERE mk2.legacy_course_id IS NULL
            AND (LOWER(mk2.nama_mk) = LOWER(c.name) OR LOWER(mk2.kode_mk) = LOWER(c.code))
          ORDER BY kur.status = 'active' DESC, s.semester ASC, mk2.nama_mk ASC
          LIMIT 5
        ) candidate
      ) suggestions ON true
      WHERE ($1 = '%%'
        OR LOWER(c.name) LIKE $1
        OR LOWER(c.code) LIKE $1)
      ${statusClause}
      ORDER BY mk.id IS NULL DESC, c.semester ASC, c.name ASC
      `,
      params,
    );

    return result.rows.map((row) => ({
      ...row,
      is_linked: Boolean(row.id_mata_kuliah),
    }));
  }

  async linkLegacyCourseToMataKuliah(id, payload) {
    const legacyCourseId = payload.legacy_course_id || payload.course_id || payload.courseId;
    if (!legacyCourseId) throw createClientError('Legacy course wajib dipilih', 400);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await this._ensureExists(client, 'mata_kuliah', id, 'MATA_KULIAH_NOT_FOUND');
      await this._ensureExists(client, 'courses', legacyCourseId, 'COURSE_NOT_FOUND');

      await client.query(
        `UPDATE mata_kuliah
         SET legacy_course_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, legacyCourseId],
      );
      await client.query(
        `UPDATE jobsheets
         SET id_mata_kuliah = $2
         WHERE course_id = $1`,
        [legacyCourseId, id],
      );

      await client.query('COMMIT');
      return (await this.getMataKuliah()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('MATA_KULIAH_LEGACY_COURSE_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async getKelasMahasiswa(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let clause = '';
    ['id_tahun_semester', 'id_semester', 'id_kelas'].forEach((key) => {
      if (filters[key]) {
        params.push(filters[key]);
        clause += ` AND km.${key} = $${params.length}`;
      }
    });
    const result = await this._pool.query(`
      SELECT km.*, ts.tahun_semester, s.semester, k.kelas,
        u.fullname, u.email, sp.nim
      FROM kelas_mhs km
      JOIN tahun_semester ts ON ts.id = km.id_tahun_semester
      JOIN semester s ON s.id = km.id_semester
      JOIN kelas k ON k.id = km.id_kelas
      JOIN users u ON u.id = km.id_mahasiswa
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(COALESCE(sp.nim, '')) LIKE $1)
      ${clause}
      ORDER BY ts.tahun_semester DESC, s.semester ASC, k.kelas ASC, sp.nim ASC
    `, params);
    return result.rows;
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
      await client.query(
        `INSERT INTO kelas_mhs (id, id_tahun_semester, id_semester, id_kelas, id_mahasiswa, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, payload.id_tahun_semester, payload.id_semester, payload.id_kelas, payload.id_mahasiswa, normalizeSimpleStatus(payload.status, 'active')],
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
      await client.query(
        `UPDATE kelas_mhs
         SET id_tahun_semester = COALESCE($2, id_tahun_semester),
             id_semester = COALESCE($3, id_semester),
             id_kelas = COALESCE($4, id_kelas),
             id_mahasiswa = COALESCE($5, id_mahasiswa),
             status = COALESCE($6, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, payload.id_tahun_semester || null, payload.id_semester || null, payload.id_kelas || null, payload.id_mahasiswa || null, payload.status ? normalizeSimpleStatus(payload.status, 'active') : null],
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

  async deleteKelasMahasiswa(id) {
    await this._ensureUnused('student_progress', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
    await this._ensureUnused('task_submissions', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
    await this._ensureUnused('student_jobsheet_progress', 'id_kelas_mhs', id, 'KELAS_MAHASISWA_USED');
    const result = await this._pool.query('DELETE FROM kelas_mhs WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('KELAS_MAHASISWA_NOT_FOUND');
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
      SELECT kp.*, ts.tahun_semester, mk.nama_mk, mk.kode_mk, s.semester, k.kelas
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

  async linkLegacyClassToKelasPraktikum(id, payload) {
    const legacyClassId = payload.legacy_class_id || payload.class_id || payload.classId;
    if (!legacyClassId) throw createClientError('Legacy class wajib dipilih', 400);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const kelasPraktikum = await client.query(
        'SELECT id FROM kelas_praktikum WHERE id = $1 LIMIT 1',
        [id],
      );
      if (!kelasPraktikum.rows.length) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');

      const legacyClass = await client.query(
        'SELECT id FROM classes WHERE id = $1 LIMIT 1',
        [legacyClassId],
      );
      if (!legacyClass.rows.length) throw new Error('CLASS_NOT_FOUND');

      await client.query(
        `UPDATE kelas_praktikum
         SET legacy_class_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, legacyClassId],
      );

      await client.query(
        `UPDATE jobsheet_classes
         SET id_kelas_praktikum = $2
         WHERE class_id = $1`,
        [legacyClassId, id],
      );

      await client.query(
        `UPDATE student_progress
         SET id_kelas_praktikum = $2
         WHERE class_id = $1`,
        [legacyClassId, id],
      );

      await client.query(
        `UPDATE student_jobsheet_progress
         SET id_kelas_praktikum = $2
         WHERE class_id = $1`,
        [legacyClassId, id],
      );

      await client.query(
        `UPDATE task_submissions ts
         SET id_kelas_praktikum = $2
         WHERE id_kelas_praktikum IS NULL
           AND EXISTS (
             SELECT 1
             FROM jobsheet_classes jc
             JOIN class_students cs
               ON cs.class_id = jc.class_id
              AND cs.student_id = ts.student_id
             WHERE jc.jobsheet_id = ts.jobsheet_id
               AND jc.class_id = $1
           )`,
        [legacyClassId, id],
      );

      await client.query(
        `UPDATE student_progress sp
         SET id_kelas_mhs = km.id
         FROM kelas_praktikum kp
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
         WHERE kp.id = $1
           AND sp.id_kelas_praktikum = kp.id
           AND sp.student_id = km.id_mahasiswa`,
        [id],
      );

      await client.query(
        `UPDATE student_jobsheet_progress sjp
         SET id_kelas_mhs = km.id
         FROM kelas_praktikum kp
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
         WHERE kp.id = $1
           AND sjp.id_kelas_praktikum = kp.id
          AND sjp.student_id = km.id_mahasiswa`,
        [id],
      );

      await client.query(
        `UPDATE task_submissions ts
         SET id_kelas_mhs = km.id
         FROM kelas_praktikum kp
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
         WHERE kp.id = $1
           AND ts.id_kelas_praktikum = kp.id
           AND ts.student_id = km.id_mahasiswa`,
        [id],
      );

      await client.query('COMMIT');
      return this.getKelasPraktikumById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_PRAKTIKUM_LEGACY_CLASS_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLegacyClassLinkCandidates(filters = {}) {
    const params = [];
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    params.push(keyword);

    let statusClause = '';
    if (filters.status === 'linked') {
      statusClause = 'AND kp.id IS NOT NULL';
    } else if (filters.status === 'unlinked') {
      statusClause = 'AND kp.id IS NULL';
    }

    const result = await this._pool.query(
      `
      SELECT
        cl.id AS legacy_class_id,
        cl.name AS legacy_class_name,
        cl.status AS legacy_class_status,
        c.id AS course_id,
        c.name AS course_name,
        c.semester AS course_semester,
        u.id AS lecturer_id,
        u.fullname AS lecturer_name,
        ap.id AS academic_period_id,
        ap.year AS academic_year,
        ap.semester_type AS academic_term,
        kp.id AS id_kelas_praktikum,
        kp.nama_kelas AS nama_kelas_praktikum,
        kp.status AS kelas_praktikum_status,
        COALESCE(suggestions.items, '[]'::json) AS suggested_kelas_praktikum
      FROM classes cl
      JOIN courses c ON c.id = cl.course_id
      JOIN users u ON u.id = cl.lecturer_id
      JOIN academic_periods ap ON ap.id = cl.academic_period_id
      LEFT JOIN kelas_praktikum kp ON kp.legacy_class_id = cl.id
      LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(candidate)) AS items
        FROM (
          SELECT
            kp2.id,
            kp2.nama_kelas,
            kp2.status,
            mk.nama_mk,
            s.semester,
            k.kelas,
            ts.tahun_semester
          FROM kelas_praktikum kp2
          JOIN mata_kuliah mk ON mk.id = kp2.id_mata_kuliah
          JOIN semester s ON s.id = kp2.id_semester
          JOIN kelas k ON k.id = kp2.id_kelas
          JOIN tahun_semester ts ON ts.id = kp2.id_tahun_semester
          WHERE kp2.legacy_class_id IS NULL
            AND LOWER(mk.nama_mk) = LOWER(c.name)
          ORDER BY ts.tahun_semester DESC, s.semester ASC, k.kelas ASC
          LIMIT 5
        ) candidate
      ) suggestions ON true
      WHERE ($1 = '%%'
        OR LOWER(cl.name) LIKE $1
        OR LOWER(c.name) LIKE $1
        OR LOWER(u.fullname) LIKE $1)
      ${statusClause}
      ORDER BY kp.id IS NULL DESC, ap.year DESC, ap.semester_type ASC, c.name ASC, cl.name ASC
      `,
      params,
    );

    return result.rows.map((row) => ({
      ...row,
      is_linked: Boolean(row.id_kelas_praktikum),
    }));
  }

  async bulkLinkLegacyClasses(payload) {
    const links = payload.links || [];
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const linked = [];
      for (const link of links) {
        const kelasPraktikumId = link.id_kelas_praktikum || link.kelas_praktikum_id || link.kelasPraktikumId;
        const legacyClassId = link.legacy_class_id || link.class_id || link.classId;

        const kelasPraktikum = await client.query(
          'SELECT id FROM kelas_praktikum WHERE id = $1 LIMIT 1',
          [kelasPraktikumId],
        );
        if (!kelasPraktikum.rows.length) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');

        const legacyClass = await client.query(
          'SELECT id FROM classes WHERE id = $1 LIMIT 1',
          [legacyClassId],
        );
        if (!legacyClass.rows.length) throw new Error('CLASS_NOT_FOUND');

        await client.query(
          `UPDATE kelas_praktikum
           SET legacy_class_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [kelasPraktikumId, legacyClassId],
        );

        await client.query(
          'UPDATE jobsheet_classes SET id_kelas_praktikum = $2 WHERE class_id = $1',
          [legacyClassId, kelasPraktikumId],
        );
        await client.query(
          'UPDATE student_progress SET id_kelas_praktikum = $2 WHERE class_id = $1',
          [legacyClassId, kelasPraktikumId],
        );
        await client.query(
          'UPDATE student_jobsheet_progress SET id_kelas_praktikum = $2 WHERE class_id = $1',
          [legacyClassId, kelasPraktikumId],
        );
        await client.query(
          `UPDATE task_submissions ts
           SET id_kelas_praktikum = $2
           WHERE id_kelas_praktikum IS NULL
             AND EXISTS (
               SELECT 1
               FROM jobsheet_classes jc
               JOIN class_students cs
                 ON cs.class_id = jc.class_id
                AND cs.student_id = ts.student_id
               WHERE jc.jobsheet_id = ts.jobsheet_id
                 AND jc.class_id = $1
             )`,
          [legacyClassId, kelasPraktikumId],
        );

        await client.query(
          `UPDATE student_progress sp
           SET id_kelas_mhs = km.id
           FROM kelas_praktikum kp
           JOIN kelas_mhs km
             ON km.id_tahun_semester = kp.id_tahun_semester
            AND km.id_semester = kp.id_semester
            AND km.id_kelas = kp.id_kelas
           WHERE kp.id = $1
             AND sp.id_kelas_praktikum = kp.id
             AND sp.student_id = km.id_mahasiswa`,
          [kelasPraktikumId],
        );
        await client.query(
          `UPDATE student_jobsheet_progress sjp
           SET id_kelas_mhs = km.id
           FROM kelas_praktikum kp
           JOIN kelas_mhs km
             ON km.id_tahun_semester = kp.id_tahun_semester
            AND km.id_semester = kp.id_semester
            AND km.id_kelas = kp.id_kelas
           WHERE kp.id = $1
             AND sjp.id_kelas_praktikum = kp.id
             AND sjp.student_id = km.id_mahasiswa`,
          [kelasPraktikumId],
        );
        await client.query(
          `UPDATE task_submissions ts
           SET id_kelas_mhs = km.id
           FROM kelas_praktikum kp
           JOIN kelas_mhs km
             ON km.id_tahun_semester = kp.id_tahun_semester
            AND km.id_semester = kp.id_semester
            AND km.id_kelas = kp.id_kelas
           WHERE kp.id = $1
             AND ts.id_kelas_praktikum = kp.id
             AND ts.student_id = km.id_mahasiswa`,
          [kelasPraktikumId],
        );

        linked.push({
          id_kelas_praktikum: kelasPraktikumId,
          legacy_class_id: legacyClassId,
        });
      }

      await client.query('COMMIT');
      return { linked_count: linked.length, linked };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('KELAS_PRAKTIKUM_LEGACY_CLASS_DUPLICATE');
      throw error;
    } finally {
      client.release();
    }
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
          mk.id AS id_mata_kuliah, mk.nama_mk, mk.tipe, mk.id_semester AS mk_id_semester,
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
        SELECT ts.tahun_semester, mk.nama_mk, s.semester, k.kelas
        FROM tahun_semester ts, mata_kuliah mk, semester s, kelas k
        WHERE ts.id = $1 AND mk.id = $2 AND s.id = $3 AND k.id = $4
        LIMIT 1
      `, [next.id_tahun_semester, next.id_mata_kuliah, next.id_semester, next.id_kelas]);
      if (!related.rows.length) throw new Error('KELAS_PRAKTIKUM_REFERENCE_NOT_FOUND');
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

  async deleteKelasPraktikum(id) {
    await this._ensureUnused('pengampu', 'id_kelas_praktikum', id, 'KELAS_PRAKTIKUM_USED');
    await this._ensureUnused('jobsheet_classes', 'id_kelas_praktikum', id, 'KELAS_PRAKTIKUM_USED');
    await this._ensureUnused('student_progress', 'id_kelas_praktikum', id, 'KELAS_PRAKTIKUM_USED');
    await this._ensureUnused('task_submissions', 'id_kelas_praktikum', id, 'KELAS_PRAKTIKUM_USED');
    await this._ensureUnused('student_jobsheet_progress', 'id_kelas_praktikum', id, 'KELAS_PRAKTIKUM_USED');
    const result = await this._pool.query('DELETE FROM kelas_praktikum WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new Error('KELAS_PRAKTIKUM_NOT_FOUND');
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
}

module.exports = AcademicDataService;
