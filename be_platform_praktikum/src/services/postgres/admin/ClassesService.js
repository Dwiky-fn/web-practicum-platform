const pool = require('..');
const {
  createId,
  displayStatus,
  displayTerm,
  mapClass,
  mapStudent,
  normalizeProgrammingLanguage,
  normalizeStatus,
} = require('./utils');
const AcademicDataService = require('./AcademicDataService');

const replaceIdsInJson = (value, idMap) => {
  if (!value || !idMap.size) return value;
  if (typeof value === 'string') return idMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => replaceIdsInJson(item, idMap));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceIdsInJson(item, idMap)]),
    );
  }
  return value;
};

const normalizeAcademicTerm = (value) => {
  if (String(value).toUpperCase() === 'GANJIL' || String(value).toLowerCase() === 'ganjil') {
    return 'GANJIL';
  }
  if (String(value).toUpperCase() === 'GENAP' || String(value).toLowerCase() === 'genap') {
    return 'GENAP';
  }
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue)) return numberValue % 2 === 0 ? 'GENAP' : 'GANJIL';
  return null;
};

const resolveProgrammingLanguage = (value, fallback = 'java') => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).toLowerCase();
  if (!['java', 'python'].includes(normalized)) {
    throw new Error('PROGRAMMING_LANGUAGE_INVALID');
  }
  return normalized;
};

const generateClassName = ({ courseName, rombel, academicYear, semester }) => {
  return [courseName, rombel, academicYear, semester]
    .filter(Boolean)
    .join(' - ');
};

const extractRombelFromFullName = (fullName, courseName) => {
  if (!fullName) return '';
  const parts = fullName.split(' - ');
  if (parts.length > 1) {
    return parts[1];
  }
  return fullName;
};

const createClientError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeJobsheetPlan = (value, fallback = 1) => {
  const plan = Number(value ?? fallback);
  if (!Number.isInteger(plan) || plan < 1) throw createClientError('Jumlah jobsheet rencana minimal 1.', 400);
  return plan;
};

class ClassesService {
  constructor() {
    this._pool = pool;
    this._academicDataService = new AcademicDataService();
  }

  _mapNativeClass(row) {
    const displayName = row.display_name || row.nama_kelas;
    return {
      id: row.id,
      name: displayName,
      namaKelas: displayName,
      nama_kelas: displayName,
      courseName: row.course_name,
      mataKuliahId: row.id_mata_kuliah,
      id_mata_kuliah: row.id_mata_kuliah,
      kodeMataKuliah: row.kode_mk,
      kode_mk: row.kode_mk,
      namaMataKuliah: row.course_name,
      nama_mata_kuliah: row.course_name,
      lecturerId: row.lecturer_id,
      lecturer: row.lecturer,
      tahunSemesterId: row.id_tahun_semester,
      id_tahun_semester: row.id_tahun_semester,
      tahunSemester: row.tahun_semester,
      tahun_semester: row.tahun_semester,
      tahunSemesterStatus: row.tahun_semester_status,
      tahun_semester_status: row.tahun_semester_status,
      semesterId: row.id_semester,
      id_semester: row.id_semester,
      kelasId: row.id_kelas,
      id_kelas: row.id_kelas,
      kelasPraktikumId: row.id,
      id_kelas_praktikum: row.id,
      namaKelasPraktikum: displayName,
      nama_kelas_praktikum: displayName,
      legacyClassLinked: false,
      semesterYear: row.tahun_semester,
      studentSemester: row.student_semester,
      semester: row.student_semester,
      kelas: row.kelas,
      jumlahMahasiswa: row.student_count ?? 0,
      jumlah_mahasiswa: row.student_count ?? 0,
      jumlahJobsheet: row.jobsheet_count ?? 0,
      jumlah_jobsheet: row.jobsheet_count ?? 0,
      jumlahJobsheetRencana: row.jumlah_jobsheet_rencana ?? 1,
      jumlah_jobsheet_rencana: row.jumlah_jobsheet_rencana ?? 1,
      jumlahJobsheetDibuat: row.jobsheet_created_count ?? row.jobsheet_count ?? 0,
      jumlah_jobsheet_dibuat: row.jobsheet_created_count ?? row.jobsheet_count ?? 0,
      jumlahJobsheetPublish: row.jobsheet_published_count ?? 0,
      jumlah_jobsheet_publish: row.jobsheet_published_count ?? 0,
      programmingLanguage: 'java',
      programmingLanguageDisplayName: 'Java',
      status: row.status === 'open' || row.status === 'active' ? 'Aktif' : 'Nonaktif',
    };
  }

  async _getOrCreateKelasId(client, kelasName) {
    const normalized = String(kelasName).trim().toUpperCase();
    const existing = await client.query('SELECT id FROM kelas WHERE UPPER(kelas) = $1 LIMIT 1', [normalized]);
    if (existing.rows.length) {
      return existing.rows[0].id;
    }
    const id = createId('kls');
    await client.query('INSERT INTO kelas (id, kelas) VALUES ($1, $2)', [id, normalized]);
    return id;
  }

  _buildKelasPraktikumName({ nama_mk, semester, kelas, tahun_semester }) {
    return `${nama_mk} - Semester ${semester} - Kelas ${kelas} - ${tahun_semester}`;
  }

  async _getNativeClasses(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let lecturerClause = '';
    let courseClause = '';
    let statusClause = '';
    let periodScopeClause = "AND LOWER(COALESCE(ts.status, 'inactive')) IN ('active', 'aktif')";
    let classActiveScopeClause = "AND LOWER(COALESCE(kp.status, 'inactive')) IN ('open', 'active', 'aktif')";

    if (filters.lecturerId) {
      params.push(filters.lecturerId);
      lecturerClause = `AND EXISTS (
        SELECT 1
        FROM pengampu p_access
        WHERE p_access.id_kelas_praktikum = kp.id
          AND p_access.id_dosen = $${params.length}
      )`;
    }
    if (filters.courseId && filters.courseId !== 'all') {
      params.push(filters.courseId);
      courseClause = `AND kp.id_mata_kuliah = $${params.length}`;
    }
    if (filters.status && filters.status !== 'all') {
      const normalized = normalizeStatus(filters.status).toLowerCase();
      params.push(normalized === 'aktif' ? 'open' : normalized);
      statusClause = `AND kp.status = $${params.length}`;
    }
    if (filters.scope === 'history' || filters.history === 'true') {
      periodScopeClause = "AND LOWER(COALESCE(ts.status, 'inactive')) NOT IN ('active', 'aktif')";
      classActiveScopeClause = '';
    } else if (filters.scope === 'all') {
      periodScopeClause = '';
      classActiveScopeClause = '';
    }

    const result = await this._pool.query(
      `
      SELECT
        kp.id,
        kp.nama_kelas,
        CONCAT(mk.nama_mk, ' - ', s.semester, k.kelas) AS display_name,
        kp.status,
        kp.jumlah_jobsheet_rencana,
        mk.id AS id_mata_kuliah,
        mk.kode_mk,
        mk.nama_mk AS course_name,
        kp.id_semester,
        kp.id_kelas,
        k.kelas,
        s.semester AS student_semester,
        p.id_dosen AS lecturer_id,
        u.fullname AS lecturer,
        ts.id AS id_tahun_semester,
        ts.tahun_semester,
        ts.status AS tahun_semester_status,
        COUNT(DISTINCT km.id_mahasiswa)::int AS student_count,
        COUNT(DISTINCT jc.id)::int AS jobsheet_created_count,
        COUNT(DISTINCT CASE WHEN jc.status = 'PUBLISHED' AND jc.is_active = true THEN jc.id END)::int AS jobsheet_published_count,
        COUNT(DISTINCT CASE WHEN jc.is_active = true THEN jc.id END)::int AS jobsheet_count
      FROM kelas_praktikum kp
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN semester s ON s.id = kp.id_semester
      JOIN kelas k ON k.id = kp.id_kelas
      JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
      LEFT JOIN pengampu p ON p.id_kelas_praktikum = kp.id AND p.peran = 'utama'
      LEFT JOIN users u ON u.id = p.id_dosen
      LEFT JOIN kelas_semester ks
        ON ks.id_tahun_semester = kp.id_tahun_semester
       AND ks.id_semester = kp.id_semester
       AND ks.id_kelas = kp.id_kelas
      LEFT JOIN kelas_mhs km
        ON km.id_kelas_semester = ks.id
       AND km.status = 'active'
      LEFT JOIN jobsheet_classes jc
        ON jc.id_kelas_praktikum = kp.id
      WHERE ($1 = '%%'
        OR LOWER(kp.nama_kelas) LIKE $1
        OR LOWER(mk.nama_mk) LIKE $1
        OR LOWER(u.fullname) LIKE $1)
        ${lecturerClause}
        ${courseClause}
        ${statusClause}
        ${periodScopeClause}
        ${classActiveScopeClause}
      GROUP BY kp.id, mk.id, s.id, k.id, p.id_dosen, u.id, ts.id
      ORDER BY LOWER(COALESCE(ts.status, 'inactive')) IN ('active', 'aktif') DESC, ts.tahun_semester DESC, mk.nama_mk ASC, kp.nama_kelas ASC
      `,
      params,
    );

    return result.rows.map((row) => this._mapNativeClass(row));
  }

  async getClasses(filters = {}) {
    return this._getNativeClasses(filters);
  }

  async canAccessKelasPraktikum(kelasPraktikumId, lecturerId) {
    const result = await this._pool.query(
      `SELECT 1
       FROM pengampu
       WHERE id_kelas_praktikum = $1
         AND id_dosen = $2
       LIMIT 1`,
      [kelasPraktikumId, lecturerId],
    );
    return Boolean(result.rows.length);
  }

  async createClass(payload) {
    const activePeriodResult = await this._pool.query(
      "SELECT id, tahun_semester FROM tahun_semester WHERE status = 'active' LIMIT 1"
    );
    const activePeriod = activePeriodResult.rows[0];
    if (!activePeriod) {
      throw createClientError('Semester aktif belum tersedia. Silakan aktifkan semester terlebih dahulu.', 400);
    }

    const courseId = payload.mataKuliahId || payload.id_mata_kuliah || payload.courseId;
    if (!courseId) throw createClientError('Mata kuliah wajib dipilih', 400);

    const lecturerId = payload.lecturerId || payload.lecturer_id;
    if (!lecturerId) throw createClientError('Dosen pengampu wajib dipilih', 400);

    const courseResult = await this._pool.query(
      `SELECT mk.nama_mk, s.semester, s.id AS id_semester
       FROM mata_kuliah mk
       JOIN semester s ON s.id = mk.id_semester
       WHERE mk.id = $1`,
      [courseId]
    );
    if (!courseResult.rows.length) {
      throw createClientError('Mata kuliah tidak ditemukan', 404);
    }
    const { nama_mk: courseName, semester: semesterNum, id_semester: idSemester } = courseResult.rows[0];

    const rombel = payload.class_name || payload.className || payload.rombel ||
      extractRombelFromFullName(payload.name, courseName);

    if (!rombel || !String(rombel).trim()) {
      throw createClientError('Kelas/Rombel wajib diisi', 400);
    }

    const idKelas = await this._getOrCreateKelasId(this._pool, rombel);

    const className = `${courseName} - Semester ${semesterNum} - Kelas ${rombel.trim().toUpperCase()} - ${activePeriod.tahun_semester}`;

    await this.ensureCourseAvailableForClass(courseId, this._pool, activePeriod.id);
    await this.ensureClassUnique({
      courseId,
      name: className,
      academicPeriodId: activePeriod.id,
    });

    const id = payload.id || createId('kp');
    const jumlahJobsheetRencana = normalizeJobsheetPlan(
      payload.jumlahJobsheetRencana || payload.jumlah_jobsheet_rencana,
      1,
    );

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO kelas_praktikum (
          id, id_tahun_semester, id_mata_kuliah, id_semester, id_kelas, nama_kelas, status, jumlah_jobsheet_rencana
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)`,
        [
          id,
          activePeriod.id,
          courseId,
          idSemester,
          idKelas,
          className,
          jumlahJobsheetRencana,
        ],
      );

      await client.query(
        `INSERT INTO pengampu (id, id_kelas_praktikum, id_dosen, peran)
         VALUES ($1, $2, $3, 'utama')
         ON CONFLICT (id_kelas_praktikum, id_dosen) DO NOTHING`,
        [createId('png'), id, lecturerId]
      );

      await client.query('COMMIT');
      return (await this.getClasses()).find((item) => item.id === id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClassDetail(id, filters = {}) {
    let nativeClass = (await this._getNativeClasses(filters)).find((item) => item.id === id);
    if (!nativeClass && !filters.scope && !filters.history) {
      nativeClass = (await this._getNativeClasses({ scope: 'all' })).find((item) => item.id === id);
    }
    if (!nativeClass) throw new Error('CLASS_NOT_FOUND');

    const [students, jobsheets] = await Promise.all([
      this.getNativeClassStudents(id),
      this.getNativeClassJobsheets(id),
    ]);

    return {
      ...nativeClass,
      students,
      jobsheets,
    };
  }

  async updateClass(id, payload) {
    const lecturerId = payload.lecturerId || payload.lecturer_id;
    const status = payload.status;
    const hasPlanUpdate = payload.jumlahJobsheetRencana !== undefined || payload.jumlah_jobsheet_rencana !== undefined;
    const courseId = payload.mataKuliahId || payload.id_mata_kuliah || payload.courseId;
    const name = payload.name;

    const existing = await this._pool.query(
      `SELECT id, id_mata_kuliah, nama_kelas, id_tahun_semester, id_kelas, id_semester
       FROM kelas_praktikum WHERE id = $1`,
      [id],
    );
    if (!existing.rows.length) throw new Error('CLASS_NOT_FOUND');
    if (!lecturerId) throw new Error('LECTURER_REQUIRED');
    if (!status) throw new Error('STATUS_REQUIRED');
    const nextPlan = hasPlanUpdate
      ? normalizeJobsheetPlan(payload.jumlahJobsheetRencana || payload.jumlah_jobsheet_rencana)
      : null;
    if (nextPlan !== null) {
      const created = await this._pool.query(
        'SELECT COUNT(*)::int AS total FROM jobsheet_classes WHERE id_kelas_praktikum = $1',
        [id],
      );
      if (nextPlan < created.rows[0].total) {
        throw createClientError('Jumlah jobsheet rencana tidak boleh lebih kecil dari jumlah jobsheet yang sudah dibuat.', 400);
      }
    }

    let targetStatus = 'open';
    const norm = normalizeStatus(status);
    if (norm === 'NONAKTIF') targetStatus = 'closed';
    else if (norm === 'ARSIP') targetStatus = 'archived';

    const nextCourseId = courseId || existing.rows[0].id_mata_kuliah;
    let nextName = name || existing.rows[0].nama_kelas;
    let nextIdSemester = existing.rows[0].id_semester;
    let nextIdKelas = existing.rows[0].id_kelas;

    if (courseId && courseId !== existing.rows[0].id_mata_kuliah) {
      const courseResult = await this._pool.query(
        `SELECT mk.nama_mk, s.semester, s.id AS id_semester
         FROM mata_kuliah mk
         JOIN semester s ON s.id = mk.id_semester
         WHERE mk.id = $1`,
        [courseId]
      );
      if (!courseResult.rows.length) throw new Error('COURSE_NOT_FOUND');
      const { nama_mk: courseName, semester: semesterNum, id_semester: idSemester } = courseResult.rows[0];
      nextIdSemester = idSemester;

      const kpResult = await this._pool.query('SELECT kelas FROM kelas WHERE id = $1', [nextIdKelas]);
      const rombel = kpResult.rows[0]?.kelas || 'A';
      const tsResult = await this._pool.query('SELECT tahun_semester FROM tahun_semester WHERE id = $1', [existing.rows[0].id_tahun_semester]);
      const tsName = tsResult.rows[0]?.tahun_semester || '';
      nextName = `${courseName} - Semester ${semesterNum} - Kelas ${rombel} - ${tsName}`;
    }

    await this.ensureClassUnique({
      id,
      courseId: nextCourseId,
      name: nextName,
      academicPeriodId: existing.rows[0].id_tahun_semester,
    });

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE kelas_praktikum
         SET id_mata_kuliah = $1,
             nama_kelas = $2,
             status = $3,
             id_semester = $4,
             jumlah_jobsheet_rencana = COALESCE($5, jumlah_jobsheet_rencana)
         WHERE id = $6`,
        [nextCourseId, nextName, targetStatus, nextIdSemester, nextPlan, id],
      );

      await client.query('DELETE FROM pengampu WHERE id_kelas_praktikum = $1', [id]);
      await client.query(
        `INSERT INTO pengampu (id, id_kelas_praktikum, id_dosen, peran)
         VALUES ($1, $2, $3, 'utama')`,
        [createId('png'), id, lecturerId],
      );

      await client.query('COMMIT');
      return this.getClassDetail(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteClass(id) {
    return this._academicDataService.deleteKelasPraktikumSafely(id);
  }

  async ensureClassUnique({ id, courseId, name, academicPeriodId }, client = this._pool) {
    const duplicate = await client.query(
      `SELECT id FROM kelas_praktikum
       WHERE id <> COALESCE($1, '')
         AND id_mata_kuliah = $2
         AND LOWER(nama_kelas) = LOWER($3)
         AND id_tahun_semester = $4
       LIMIT 1`,
      [id || '', courseId, name, academicPeriodId],
    );

    if (duplicate.rows.length) throw new Error('CLASS_DUPLICATE');
  }

  async ensureCourseAvailableForClass(courseId, client = this._pool, academicPeriodId = null) {
    const result = await client.query(
      `
      SELECT mk.id, mk.id_semester, s.semester, ts.tahun_semester
      FROM mata_kuliah mk
      JOIN semester s ON s.id = mk.id_semester
      CROSS JOIN LATERAL (
        SELECT id, tahun_semester
        FROM tahun_semester
        WHERE ($2::varchar IS NULL AND status = 'active')
           OR id = $2
        LIMIT 1
      ) ts
      WHERE mk.id = $1
      `,
      [courseId, academicPeriodId],
    );

    if (!result.rows.length) throw new Error('COURSE_NOT_FOUND');

    const course = result.rows[0];
    const isGanjilSemester = course.tahun_semester.toLowerCase().includes('ganjil');
    const activeStudentSemesters = isGanjilSemester
      ? [1, 3, 5, 7]
      : [2, 4, 6, 8];

    if (!activeStudentSemesters.includes(Number(course.semester))) {
      throw new Error('COURSE_INACTIVE');
    }
  }

  async getClassTemplates(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let semesterClause = '';

    if (filters.semester) {
      const term = normalizeAcademicTerm(filters.semester);
      if (term) {
        params.push(term);
        semesterClause = `AND ts.tahun_semester LIKE $${params.length}`;
      }
    }

    const result = await this._pool.query(
      `
      SELECT kp.id, kp.nama_kelas AS name,
        kp.id AS id_kelas_praktikum, kp.nama_kelas AS nama_kelas_praktikum,
        mk.id AS id_mata_kuliah, mk.nama_mk AS course_name, s.semester AS student_semester,
        u.id AS lecturer_id, u.fullname AS lecturer_name,
        ts.id AS academic_period_id, ts.tahun_semester,
        tsp.study_program_id, tsp.study_program_name,
        COUNT(DISTINCT jc.id)::int AS jobsheet_count,
        COUNT(DISTINCT km.id_mahasiswa)::int AS student_count
      FROM kelas_praktikum kp
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN semester s ON s.id = kp.id_semester
      JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
      LEFT JOIN pengampu p ON p.id_kelas_praktikum = kp.id AND p.peran = 'utama'
      LEFT JOIN users u ON u.id = p.id_dosen
      LEFT JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
      LEFT JOIN kelas_semester ks ON ks.id_tahun_semester = kp.id_tahun_semester
                                  AND ks.id_semester = kp.id_semester
                                  AND ks.id_kelas = kp.id_kelas
      LEFT JOIN kelas_mhs km ON km.id_kelas_semester = ks.id
                            AND km.status = 'active'
      LEFT JOIN LATERAL (
        SELECT sp.study_program_id, sprog.name AS study_program_name
        FROM kelas_mhs lkm
        JOIN kelas_semester lks ON lks.id = lkm.id_kelas_semester
        JOIN student_profiles sp ON sp.user_id = lkm.id_mahasiswa
        LEFT JOIN study_programs sprog ON sprog.id = sp.study_program_id
        WHERE lks.id_tahun_semester = kp.id_tahun_semester
          AND lks.id_semester = kp.id_semester
          AND lks.id_kelas = kp.id_kelas
          AND lkm.status = 'active'
        GROUP BY sp.study_program_id, sprog.name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) tsp ON true
      WHERE ($1 = '%%' OR LOWER(kp.nama_kelas) LIKE $1 OR LOWER(mk.nama_mk) LIKE $1 OR LOWER(u.fullname) LIKE $1)
        ${semesterClause}
      GROUP BY kp.id, mk.id, s.id, u.id, ts.id, tsp.study_program_id, tsp.study_program_name
      ORDER BY ts.tahun_semester DESC, mk.nama_mk ASC, kp.nama_kelas ASC
      `,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      kelas_praktikum_id: row.id_kelas_praktikum || undefined,
      id_kelas_praktikum: row.id_kelas_praktikum || undefined,
      nama_kelas_praktikum: row.nama_kelas_praktikum || undefined,
      mataKuliahId: row.id_mata_kuliah,
      id_mata_kuliah: row.id_mata_kuliah,
      course_name: row.course_name,
      lecturer_id: row.lecturer_id,
      lecturer_name: row.lecturer_name,
      programming_language: 'java',
      programming_language_display_name: 'Java',
      study_program_id: row.study_program_id,
      study_program_name: row.study_program_name,
      semester: row.student_semester,
      academic_term: row.tahun_semester.includes('Ganjil') ? 'Ganjil' : 'Genap',
      academic_term_value: row.tahun_semester.includes('Ganjil') ? 'GANJIL' : 'GENAP',
      academic_period_id: row.academic_period_id,
      academic_year: row.tahun_semester,
      jobsheet_count: row.jobsheet_count,
      student_count: row.student_count,
    }));
  }

  async getClassClonePreview(classId) {
    const source = await this._pool.query(
      `
      SELECT kp.id, kp.nama_kelas AS name,
        mk.nama_mk AS course_name, u.fullname AS lecturer_name,
        s.semester, ts.tahun_semester,
        COUNT(DISTINCT jc.id)::int AS jobsheet_count
      FROM kelas_praktikum kp
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN semester s ON s.id = kp.id_semester
      JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
      LEFT JOIN pengampu p ON p.id_kelas_praktikum = kp.id AND p.peran = 'utama'
      LEFT JOIN users u ON u.id = p.id_dosen
      LEFT JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
      WHERE kp.id = $1
      GROUP BY kp.id, mk.id, s.id, u.id, ts.id
      `,
      [classId],
    );

    if (!source.rows.length) throw new Error('CLONE_SOURCE_CLASS_NOT_FOUND');

    const row = source.rows[0];
    return {
      source_class: {
        id: row.id,
        name: row.name,
        course_name: row.course_name,
        lecturer_name: row.lecturer_name,
        programming_language: 'java',
        programming_language_display_name: 'Java',
        semester: row.semester,
        academic_term: row.tahun_semester.includes('Ganjil') ? 'Ganjil' : 'Genap',
        academic_term_value: row.tahun_semester.includes('Ganjil') ? 'GANJIL' : 'GENAP',
        academic_year: row.tahun_semester,
      },
      copyable_data: {
        course: true,
        lecturer: true,
        jobsheets: row.jobsheet_count,
        settings: true,
      },
      excluded_data: [
        'students',
        'submissions',
        'grades',
        'lecturer_feedback',
        'ai_feedback',
        'ai_validation',
        'student_progress',
        'execution_history',
        'compile_result',
        'run_result',
      ],
    };
  }

  async _cloneJobsheetsToClass(client, sourceClassId, targetClassId) {
    const sourceJobsheets = await client.query(
      `
      SELECT
        jc.*,
        to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline,
        j.id_mata_kuliah,
        j.status AS jobsheet_status,
        j.programming_language,
        j.editor_mode
      FROM jobsheet_classes jc
      JOIN jobsheets j ON j.id = jc.jobsheet_id
      WHERE jc.id_kelas_praktikum = $1
      ORDER BY jc.deadline ASC NULLS LAST, jc.title ASC
      `,
      [sourceClassId],
    );

    for (const jobsheetClass of sourceJobsheets.rows) {
      const newJobsheetId = createId('job');
      const idMap = new Map();

      const experiments = await client.query(
        'SELECT * FROM experiments WHERE jobsheet_id = $1 ORDER BY id ASC',
        [jobsheetClass.jobsheet_id],
      );
      const exercises = await client.query(
        'SELECT * FROM exercises WHERE jobsheet_id = $1 ORDER BY id ASC',
        [jobsheetClass.jobsheet_id],
      );

      const clonedExperiments = experiments.rows.map((experiment) => {
        const id = createId('exp');
        idMap.set(experiment.id, id);
        return { ...experiment, id };
      });
      const clonedExercises = exercises.rows.map((exercise) => {
        const id = createId('exe');
        idMap.set(exercise.id, id);
        return { ...exercise, id };
      });

      const clonedContent = replaceIdsInJson(jobsheetClass.content || {}, idMap);
      await client.query(
        `
        INSERT INTO jobsheets (id, id_mata_kuliah, title, description, goal, content, status, programming_language, editor_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          newJobsheetId,
          jobsheetClass.id_mata_kuliah,
          jobsheetClass.title,
          jobsheetClass.description || '',
          jobsheetClass.goal || '',
          JSON.stringify(clonedContent),
          jobsheetClass.jobsheet_status || 'DRAFT',
          jobsheetClass.programming_language || 'java',
          jobsheetClass.editor_mode || 'mini_ide',
        ],
      );

      for (const experiment of clonedExperiments) {
        await client.query(
          `
          INSERT INTO experiments (id, jobsheet_id, title, instruction_content, template_code, rubric)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            experiment.id,
            newJobsheetId,
            experiment.title,
            JSON.stringify(experiment.instruction_content || {}),
            experiment.template_code || '',
            experiment.rubric || 0,
          ],
        );
      }

      for (const exercise of clonedExercises) {
        await client.query(
          `
          INSERT INTO exercises (id, jobsheet_id, title, instruction_content, template_code, rubric)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            exercise.id,
            newJobsheetId,
            exercise.title,
            JSON.stringify(exercise.instruction_content || {}),
            exercise.template_code || '',
            exercise.rubric || 0,
          ],
        );
      }

      const newJobsheetClassId = createId('jkc');
      await client.query(
        `
        INSERT INTO jobsheet_classes (
          id, jobsheet_id, id_kelas_praktikum, is_active, deadline,
          title, description, goal, content, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          newJobsheetClassId,
          newJobsheetId,
          targetClassId,
          jobsheetClass.is_active,
          jobsheetClass.deadline,
          jobsheetClass.title,
          jobsheetClass.description || '',
          jobsheetClass.goal || '',
          JSON.stringify(clonedContent),
          jobsheetClass.status,
        ],
      );

      const classExperiments = await client.query(
        'SELECT * FROM class_experiments WHERE jobsheet_class_id = $1 ORDER BY id ASC',
        [jobsheetClass.id],
      );
      for (const experiment of classExperiments.rows) {
        await client.query(
          `
          INSERT INTO class_experiments (
            id, jobsheet_class_id, experiment_id, title, instruction_content, template_code
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            createId('cex'),
            newJobsheetClassId,
            idMap.get(experiment.experiment_id) || null,
            experiment.title,
            JSON.stringify(replaceIdsInJson(experiment.instruction_content || {}, idMap)),
            experiment.template_code || '',
          ],
        );
      }

      const classExercises = await client.query(
        'SELECT * FROM class_exercises WHERE jobsheet_class_id = $1 ORDER BY id ASC',
        [jobsheetClass.id],
      );
      for (const exercise of classExercises.rows) {
        await client.query(
          `
          INSERT INTO class_exercises (
            id, jobsheet_class_id, exercise_id, title, instruction_content, template_code
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            createId('cex'),
            newJobsheetClassId,
            idMap.get(exercise.exercise_id) || null,
            exercise.title,
            JSON.stringify(replaceIdsInJson(exercise.instruction_content || {}, idMap)),
            exercise.template_code || '',
          ],
        );
      }
    }

    return sourceJobsheets.rows.length;
  }

  async _autoEnrollStudents(client, classId, payload, courseId, courseSemester) {
    const kpResult = await client.query(
      'SELECT id_tahun_semester, id_semester, id_kelas FROM kelas_praktikum WHERE id = $1 LIMIT 1',
      [classId]
    );
    if (!kpResult.rows.length) return 0;
    const kp = kpResult.rows[0];

    const result = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM kelas_mhs
      WHERE id_tahun_semester = $1
        AND id_semester = $2
        AND id_kelas = $3
        AND status = 'active'
      `,
      [kp.id_tahun_semester, kp.id_semester, kp.id_kelas]
    );
    return result.rows[0].count;
  }

  async cloneClass(payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const sourceResult = await client.query(
        `
        SELECT kp.*, mk.nama_mk AS course_name, s.semester AS course_semester,
          ts.tahun_semester AS source_tahun_semester,
          k.kelas AS source_rombel
        FROM kelas_praktikum kp
        JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
        JOIN semester s ON s.id = kp.id_semester
        JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
        JOIN kelas k ON k.id = kp.id_kelas
        WHERE kp.id = $1
        LIMIT 1
        `,
        [payload.source_class_id],
      );
      if (!sourceResult.rows.length) {
        throw createClientError('Kelas sumber tidak ditemukan', 404);
      }

      const sourceClass = sourceResult.rows[0];

      const activePeriodResult = await client.query(
        "SELECT id, tahun_semester FROM tahun_semester WHERE status = 'active' LIMIT 1"
      );
      const activePeriod = activePeriodResult.rows[0];
      if (!activePeriod) {
        throw createClientError('Semester aktif belum tersedia. Silakan aktifkan semester terlebih dahulu.', 400);
      }

      const academicPeriodId = activePeriod.id;
      const newClassId = createId('kp');
      
      let lecturerId = payload.lecturer_id;
      if (!lecturerId) {
        const lecturerResult = await client.query(
          "SELECT id_dosen FROM pengampu WHERE id_kelas_praktikum = $1 AND peran = 'utama' LIMIT 1",
          [payload.source_class_id]
        );
        lecturerId = lecturerResult.rows[0]?.id_dosen;
      }
      if (!lecturerId) throw createClientError('Dosen pengampu wajib dipilih', 400);

      const rombel = payload.class_name || payload.className || payload.rombel ||
        extractRombelFromFullName(payload.name, sourceClass.course_name);

      if (!rombel || !String(rombel).trim()) {
        throw createClientError('Kelas/Rombel wajib diisi', 400);
      }

      const isSourceGanjil = sourceClass.source_tahun_semester.toLowerCase().includes('ganjil');
      const isTargetGanjil = activePeriod.tahun_semester.toLowerCase().includes('ganjil');

      if (isSourceGanjil !== isTargetGanjil) {
        throw createClientError(
          `Kelas semester ${isSourceGanjil ? 'Ganjil' : 'Genap'} tidak dapat digunakan sebagai template untuk semester ${isTargetGanjil ? 'Ganjil' : 'Genap'}`,
          400
        );
      }

      const className = `${sourceClass.course_name} - Semester ${sourceClass.course_semester} - Kelas ${rombel.trim().toUpperCase()} - ${activePeriod.tahun_semester}`;

      await this.ensureCourseAvailableForClass(sourceClass.id_mata_kuliah, client, academicPeriodId);
      await this.ensureClassUnique({
        courseId: sourceClass.id_mata_kuliah,
        name: className,
        academicPeriodId,
      }, client);

      const idKelas = await this._getOrCreateKelasId(client, rombel);

      await client.query(
        `
        INSERT INTO kelas_praktikum (
          id, id_tahun_semester, id_mata_kuliah, id_semester, id_kelas, nama_kelas, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open')
        `,
        [newClassId, academicPeriodId, sourceClass.id_mata_kuliah, sourceClass.id_semester, idKelas, className],
      );

      await client.query(
        `INSERT INTO pengampu (id, id_kelas_praktikum, id_dosen, peran)
         VALUES ($1, $2, $3, 'utama')
         ON CONFLICT (id_kelas_praktikum, id_dosen) DO NOTHING`,
        [createId('png'), newClassId, lecturerId]
      );

      const jobsheetsCopied = payload.copy_jobsheets
        ? await this._cloneJobsheetsToClass(client, sourceClass.id, newClassId)
        : 0;
      const studentsAdded = payload.auto_enroll_students
        ? await this._autoEnrollStudents(
          client,
          newClassId,
          payload,
          sourceClass.id_mata_kuliah,
          sourceClass.course_semester,
        )
        : 0;

      await client.query('COMMIT');

      return {
        kelas_praktikum_id: newClassId,
        students_added: studentsAdded,
        jobsheets_copied: jobsheetsCopied,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getNativeClassStudents(kelasPraktikumId) {
    const result = await this._pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.is_active,
        sp.nim, sp.program_studi, sp.jurusan, sp.angkatan, sp.semester,
        sp.status, u.avatar_url
      FROM kelas_praktikum kp
      JOIN kelas_semester ks
        ON ks.id_tahun_semester = kp.id_tahun_semester
       AND ks.id_semester = kp.id_semester
       AND ks.id_kelas = kp.id_kelas
      JOIN kelas_mhs km
        ON km.id_kelas_semester = ks.id
      JOIN users u ON u.id = km.id_mahasiswa
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE kp.id = $1
        AND km.status = 'active'
      ORDER BY sp.nim ASC
      `,
      [kelasPraktikumId],
    );

    return result.rows.map(mapStudent);
  }

  async getStudentCandidates(classId, filters = {}) {
    const classInfo = await this._pool.query(
      `SELECT kp.id_tahun_semester, kp.id_semester, s.semester
       FROM kelas_praktikum kp
       JOIN semester s ON s.id = kp.id_semester
       WHERE kp.id = $1`,
      [classId],
    );

    if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');

    const {
      id_tahun_semester: idTahunSemester,
      semester: courseSemester,
    } = classInfo.rows[0];

    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword, idTahunSemester, Number(courseSemester)];
    let semesterClause = '';

    if (filters.semester && filters.semester !== 'all') {
      params.push(Number(filters.semester));
      semesterClause = `AND sp.semester = $${params.length}`;
    }

    const result = await this._pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.is_active,
        sp.nim, sp.program_studi, sp.jurusan, sp.angkatan, sp.semester,
        sp.status, u.avatar_url
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'MAHASISWA'
        AND NOT EXISTS (
          SELECT 1 FROM kelas_mhs km
          WHERE km.id_mahasiswa = u.id
            AND km.id_tahun_semester = $2
            AND km.status = 'active'
        )
        AND sp.semester = $3
        AND ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(COALESCE(sp.nim, '')) LIKE $1)
        ${semesterClause}
      ORDER BY sp.nim ASC
      `,
      params,
    );

    return result.rows.map(mapStudent);
  }

  async assignStudentsToClass(classId, studentIds) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const classInfo = await client.query(
        `SELECT id_tahun_semester, id_semester, id_kelas
         FROM kelas_praktikum
         WHERE id = $1`,
        [classId],
      );
      if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');
      const { id_tahun_semester, id_semester, id_kelas } = classInfo.rows[0];

      const groupResult = await client.query(
        'SELECT id FROM kelas_semester WHERE id_tahun_semester = $1 AND id_semester = $2 AND id_kelas = $3 LIMIT 1',
        [id_tahun_semester, id_semester, id_kelas]
      );
      let id_kelas_semester = groupResult.rows[0]?.id || null;
      if (!id_kelas_semester) {
        id_kelas_semester = createId('ks');
        await client.query(
          `INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_kelas_semester, id_tahun_semester, id_semester, id_kelas, 'active']
        );
      }

      for (const studentId of studentIds) {
        const id = createId('km');
        await client.query(
          `INSERT INTO kelas_mhs (id, id_tahun_semester, id_semester, id_kelas, id_mahasiswa, status, id_kelas_semester)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)
           ON CONFLICT (id_tahun_semester, id_mahasiswa)
           DO UPDATE SET id_semester = $3, id_kelas = $4, status = 'active', id_kelas_semester = $6`,
          [id, id_tahun_semester, id_semester, id_kelas, studentId, id_kelas_semester],
        );
      }

      await client.query('COMMIT');
      return this.getNativeClassStudents(classId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeStudentFromClass(classId, studentId) {
    const classInfo = await this._pool.query(
      `SELECT id_tahun_semester, id_semester, id_kelas
       FROM kelas_praktikum
       WHERE id = $1`,
      [classId],
    );
    if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');
    const { id_tahun_semester, id_semester, id_kelas } = classInfo.rows[0];

    const result = await this._pool.query(
      `
      DELETE FROM kelas_mhs
      WHERE id_tahun_semester = $1
        AND id_semester = $2
        AND id_kelas = $3
        AND id_mahasiswa = $4
      RETURNING id
      `,
      [id_tahun_semester, id_semester, id_kelas, studentId],
    );

    if (!result.rows.length) {
      throw new Error('STUDENT_NOT_FOUND_IN_CLASS');
    }
  }

  async getNativeClassJobsheets(kelasPraktikumId) {
    const result = await this._pool.query(
      `
      SELECT
        jc.id,
        jc.jobsheet_id,
        jc.title,
        jc.urutan,
        to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline,
        jc.status
      FROM jobsheet_classes jc
      JOIN jobsheets j ON j.id = jc.jobsheet_id
      WHERE jc.id_kelas_praktikum = $1 AND jc.is_active = true
      ORDER BY jc.urutan ASC NULLS LAST, j.created_at ASC
      `,
      [kelasPraktikumId],
    );

    return result.rows.map((row) => ({
      id: row.jobsheet_id,
      classJobsheetId: row.id,
      urutan: row.urutan,
      sequence: row.urutan,
      title: row.title,
      deadline: row.deadline || '-',
      status: displayStatus(row.status),
    }));
  }

  async assignClassSemesterStudentsToClass(classId, kelasSemesterId) {
    const studentsRes = await this._pool.query(
      `SELECT id_mahasiswa FROM kelas_mhs WHERE id_kelas_semester = $1 AND status = 'active'`,
      [kelasSemesterId]
    );

    const studentIds = studentsRes.rows.map(row => row.id_mahasiswa);
    if (studentIds.length === 0) {
      throw new Error('KELAS_SEMESTER_EMPTY');
    }

    return this.assignStudentsToClass(classId, studentIds);
  }
}

module.exports = ClassesService;
