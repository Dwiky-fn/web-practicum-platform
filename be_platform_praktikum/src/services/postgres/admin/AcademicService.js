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

const createClientError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseTahunSemester = (str) => {
  if (!str) return { year: '', term: '' };
  const parts = str.includes('-') ? str.split('-') : str.split(' ');
  const year = parts[0] || '';
  const term = (parts[1] || '').toUpperCase();
  return { year, term };
};

class AcademicService {
  constructor() {
    this._pool = pool;
  }

  async getSemesters() {
    const result = await this._pool.query(`
      SELECT id, tahun_semester, status
      FROM tahun_semester
      ORDER BY status = 'active' DESC, tahun_semester DESC
    `);

    return result.rows.map((row) => {
      const { year, term } = parseTahunSemester(row.tahun_semester);
      return {
        id: row.id,
        year: year,
        term: displayTerm(term),
        status: row.status === 'active' ? 'Aktif' : 'Nonaktif',
      };
    });
  }

  async createSemester(payload) {
    const client = await this._pool.connect();
    const id = payload.id || createId('ts');
    const termDb = dbTerm(payload.term || payload.semester);
    const tahunSemesterStr = `${payload.year}-${termDb}`;
    const status = payload.status === 'Aktif' ? 'active' : 'inactive';

    try {
      await client.query('BEGIN');
      const duplicate = await client.query(
        'SELECT id FROM tahun_semester WHERE LOWER(tahun_semester) = LOWER($1) LIMIT 1',
        [tahunSemesterStr],
      );
      if (duplicate.rows.length) throw new Error('SEMESTER_DUPLICATE');

      if (status === 'active') {
        await client.query("UPDATE tahun_semester SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
      }
      await client.query(
        `INSERT INTO tahun_semester (id, tahun_semester, status)
         VALUES ($1, $2, $3)`,
        [id, tahunSemesterStr, status],
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
      const found = await client.query('SELECT id FROM tahun_semester WHERE id = $1', [id]);
      if (!found.rows.length) throw new Error('SEMESTER_NOT_FOUND');
      await client.query("UPDATE tahun_semester SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
      await client.query("UPDATE tahun_semester SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSemester(id, force = false) {
    const found = await this._pool.query(
      "SELECT id, status FROM tahun_semester WHERE id = $1",
      [id],
    );
    if (!found.rows.length) throw new Error('SEMESTER_NOT_FOUND');
    if (found.rows[0].status === 'active') throw new Error('SEMESTER_ACTIVE_DELETE');

    if (force) {
      const client = await this._pool.connect();
      try {
        await client.query('BEGIN');
        // Find all kelas_semester
        const ksRes = await client.query('SELECT id FROM kelas_semester WHERE id_tahun_semester = $1', [id]);
        const ksIds = ksRes.rows.map(r => r.id);
        for (const ksId of ksIds) {
          const studentsRes = await client.query('SELECT id FROM kelas_mhs WHERE id_kelas_semester = $1', [ksId]);
          const mhsIds = studentsRes.rows.map(r => r.id);
          if (mhsIds.length > 0) {
            await client.query('DELETE FROM student_progress WHERE id_kelas_mhs = ANY($1)', [mhsIds]);
            await client.query('DELETE FROM task_submissions WHERE id_kelas_mhs = ANY($1)', [mhsIds]);
            await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_mhs = ANY($1)', [mhsIds]);
            await client.query('DELETE FROM kelas_mhs WHERE id_kelas_semester = $1', [ksId]);
          }
        }
        await client.query('DELETE FROM kelas_semester WHERE id_tahun_semester = $1', [id]);

        // Find all kelas_praktikum
        const kpRes = await client.query('SELECT id FROM kelas_praktikum WHERE id_tahun_semester = $1', [id]);
        const kpIds = kpRes.rows.map(r => r.id);
        if (kpIds.length > 0) {
          await client.query('DELETE FROM jobsheet_classes WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM task_submissions WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM student_jobsheet_progress WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = ANY($1)', [kpIds]);
          await client.query('DELETE FROM kelas_praktikum WHERE id_tahun_semester = $1', [id]);
        }
        await client.query('DELETE FROM tahun_semester WHERE id = $1', [id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const used = await this._pool.query(
        'SELECT id FROM kelas_praktikum WHERE id_tahun_semester = $1 LIMIT 1',
        [id],
      );
      if (used.rows.length) throw new Error('SEMESTER_HAS_CLASSES');

      await this._pool.query('DELETE FROM tahun_semester WHERE id = $1', [id]);
    }
  }

  async getCourses(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let semesterClause = '';

    if (filters.semester && filters.semester !== 'all') {
      params.push(Number(filters.semester));
      semesterClause = `AND s.semester = $${params.length}`;
    }

    const [result, activePeriod] = await Promise.all([
      this._pool.query(
        `
        SELECT mk.id, mk.kode_mk AS code, mk.nama_mk AS name, s.semester, mk.sks, 'AKTIF' AS status
        FROM mata_kuliah mk
        JOIN semester s ON s.id = mk.id_semester
        WHERE ($1 = '%%' OR LOWER(mk.kode_mk) LIKE $1 OR LOWER(mk.nama_mk) LIKE $1)
          ${semesterClause}
        ORDER BY s.semester ASC, mk.nama_mk ASC
        `,
        params,
      ),
      this._pool.query(
        "SELECT tahun_semester FROM tahun_semester WHERE status = 'active' LIMIT 1",
      ),
    ]);

    const activePeriodName = activePeriod.rows[0]?.tahun_semester || '';
    const { term: termDb } = parseTahunSemester(activePeriodName);
    const activeStudentSemesters = activeStudentSemestersByTerm[termDb] || [];

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

    const semesterQuery = await this._pool.query(
      'SELECT id FROM semester WHERE semester = $1 LIMIT 1',
      [Number(payload.semester)]
    );
    let semesterId = semesterQuery.rows[0]?.id;
    if (!semesterId) {
      semesterId = `sem_${payload.semester}`;
      await this._pool.query(
        'INSERT INTO semester (id, semester) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [semesterId, Number(payload.semester)]
      );
    }

    const kurikulumQuery = await this._pool.query(
      "SELECT id FROM kurikulum WHERE status = 'active' LIMIT 1"
    );
    const kurikulumId = kurikulumQuery.rows[0]?.id || 'kur-1';

    await this._pool.query(
      `INSERT INTO mata_kuliah (id, kode_mk, nama_mk, sks, tipe, id_kurikulum, id_semester)
       VALUES ($1, $2, $3, $4, 'praktikum', $5, $6)`,
      [
        id,
        payload.code,
        payload.name,
        Number(payload.sks),
        kurikulumId,
        semesterId,
      ],
    );

    return (await this.getCourses()).find((item) => item.id === id);
  }

  async updateCourse(id, payload) {
    const current = await this._pool.query(
      `SELECT mk.id, mk.kode_mk AS code, mk.nama_mk AS name, s.semester
       FROM mata_kuliah mk
       JOIN semester s ON s.id = mk.id_semester
       WHERE mk.id = $1`,
      [id],
    );

    if (!current.rows.length) throw new Error('COURSE_NOT_FOUND');

    const code = payload.code || current.rows[0].code;
    const name = payload.name || current.rows[0].name;
    const semesterNum = payload.semester ? Number(payload.semester) : Number(current.rows[0].semester);

    await this.ensureCourseUnique({
      id,
      code,
      name,
      semester: semesterNum,
    });

    const semesterQuery = await this._pool.query(
      'SELECT id FROM semester WHERE semester = $1 LIMIT 1',
      [semesterNum]
    );
    let semesterId = semesterQuery.rows[0]?.id;
    if (!semesterId) {
      semesterId = `sem_${semesterNum}`;
      await this._pool.query(
        'INSERT INTO semester (id, semester) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [semesterId, semesterNum]
      );
    }

    await this._pool.query(
      `UPDATE mata_kuliah
       SET
        kode_mk = $2,
        nama_mk = $3,
        sks = COALESCE($4, sks),
        id_semester = $5
       WHERE id = $1`,
      [
        id,
        code,
        name,
        payload.sks ? Number(payload.sks) : null,
        semesterId,
      ],
    );

    return (await this.getCourses()).find((item) => item.id === id);
  }

  async deleteCourse(id, force = false) {
    const found = await this._pool.query('SELECT id FROM mata_kuliah WHERE id = $1', [id]);
    if (!found.rows.length) throw new Error('COURSE_NOT_FOUND');

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
        await client.query('DELETE FROM mata_kuliah WHERE id = $1', [id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const used = await this._pool.query(
        'SELECT id FROM kelas_praktikum WHERE id_mata_kuliah = $1 LIMIT 1',
        [id],
      );
      if (used.rows.length) throw new Error('COURSE_HAS_CLASSES');

      await this._pool.query('DELETE FROM mata_kuliah WHERE id = $1', [id]);
    }
  }

  async ensureCourseUnique({ id, code, name, semester }) {
    const duplicate = await this._pool.query(
      `SELECT mk.id FROM mata_kuliah mk
       JOIN semester s ON s.id = mk.id_semester
       WHERE mk.id <> COALESCE($1, '')
         AND (LOWER(mk.kode_mk) = LOWER($2) OR (LOWER(mk.nama_mk) = LOWER($3) AND s.semester = $4))
       LIMIT 1`,
      [id || '', code, name, Number(semester)],
    );

    if (duplicate.rows.length) throw new Error('COURSE_DUPLICATE');
  }

  async advanceSemester() {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const activeResult = await client.query(
        "SELECT id, tahun_semester FROM tahun_semester WHERE status = 'active' LIMIT 1"
      );
      const activePeriod = activeResult.rows[0];
      if (!activePeriod) {
        throw createClientError('Semester aktif belum tersedia', 400);
      }

      const activePeriodName = activePeriod.tahun_semester;
      const { year: currentYear, term: currentType } = parseTahunSemester(activePeriodName);

      let nextYear = currentYear;
      let nextType = '';

      if (currentType === 'GANJIL') {
        nextType = 'GENAP';
      } else if (currentType === 'GENAP') {
        nextType = 'GANJIL';
        const yearParts = currentYear.split('/');
        if (yearParts.length === 2) {
          const startYear = Number(yearParts[0]);
          const endYear = Number(yearParts[1]);
          if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
            nextYear = `${startYear + 1}/${endYear + 1}`;
          } else {
            throw createClientError('Tahun akademik saat ini tidak valid', 400);
          }
        } else {
          throw createClientError('Format tahun akademik saat ini tidak valid', 400);
        }
      } else {
        throw createClientError('Semester aktif tidak valid', 400);
      }

      const nextTahunSemesterStr = `${nextYear}-${nextType}`;

      let nextPeriodId = '';
      const checkResult = await client.query(
        'SELECT id, tahun_semester, status FROM tahun_semester WHERE tahun_semester = $1 LIMIT 1',
        [nextTahunSemesterStr]
      );

      let nextPeriod = checkResult.rows[0];
      if (!nextPeriod) {
        nextPeriodId = createId('ts');
        await client.query(
          `INSERT INTO tahun_semester (id, tahun_semester, status)
           VALUES ($1, $2, 'inactive')`,
          [nextPeriodId, nextTahunSemesterStr]
        );
        nextPeriod = {
          id: nextPeriodId,
          tahun_semester: nextTahunSemesterStr,
          status: 'inactive'
        };
      } else {
        nextPeriodId = nextPeriod.id;
      }

      await client.query("UPDATE tahun_semester SET status = 'inactive', updated_at = CURRENT_TIMESTAMP");
      await client.query("UPDATE tahun_semester SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [nextPeriodId]);

      await client.query('COMMIT');

      const prevParsed = parseTahunSemester(activePeriodName);
      const nextParsed = parseTahunSemester(nextTahunSemesterStr);

      return {
        previous_semester: {
          academic_year: prevParsed.year,
          semester: displayTerm(prevParsed.term),
          name: `${prevParsed.year} - ${displayTerm(prevParsed.term)}`
        },
        active_semester: {
          id: nextPeriodId,
          academic_year: nextParsed.year,
          semester: displayTerm(nextParsed.term),
          name: `${nextParsed.year} - ${displayTerm(nextParsed.term)}`,
          is_active: true
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AcademicService;
