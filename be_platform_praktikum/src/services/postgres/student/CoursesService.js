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
    const nativeResult = await this._pool.query(`
      SELECT
        mk.id,
        mk.id AS "mataKuliahId",
        mk.id AS id_mata_kuliah,
        mk.nama_mk AS name,
        mk.kode_mk AS code,
        '' AS description,
        s.semester,
        mk.sks,
        k.status,
        mk.created_at
      FROM mata_kuliah mk
      JOIN semester s ON s.id = mk.id_semester
      JOIN kurikulum k ON k.id = mk.id_kurikulum
      ORDER BY s.semester ASC, mk.nama_mk ASC
    `);

    if (nativeResult.rows.length) return nativeResult.rows;

    // Legacy fallback only. Do not use for new academic flow.
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
    const nativeResult = await this._pool.query(
      `
      SELECT
        mk.id,
        mk.id AS "mataKuliahId",
        mk.id AS id_mata_kuliah,
        kp.id AS "kelasPraktikumId",
        kp.id AS id_kelas_praktikum,
        km.id AS "kelasMahasiswaId",
        km.id AS id_kelas_mhs,
        kp.legacy_class_id AS class_id,
        kp.legacy_class_id AS "classId",
        mk.nama_mk AS name,
        mk.kode_mk AS code,
        '' AS description,
        s.semester,
        mk.sks,
        CASE WHEN kp.status = 'open' THEN 'AKTIF' ELSE UPPER(kp.status) END AS status,
        mk.created_at,
        COALESCE(string_agg(DISTINCT lecturer.fullname, ', ') FILTER (WHERE lecturer.id IS NOT NULL), '-') AS lecturer,
        COALESCE(ROUND(AVG(sp.progress)::numeric), 0)::int AS progress,
        COUNT(DISTINCT j.id)::int AS jobsheet_count,
        'java' AS programming_language
      FROM kelas_mhs km
      JOIN kelas_semester ks
        ON (
          ks.id = km.id_kelas_semester
          OR (
            km.id_kelas_semester IS NULL
            AND ks.id_tahun_semester = km.id_tahun_semester
            AND ks.id_semester = km.id_semester
            AND ks.id_kelas = km.id_kelas
          )
        )
      JOIN kelas_praktikum kp
        ON kp.id_tahun_semester = ks.id_tahun_semester
       AND kp.id_semester = ks.id_semester
       AND kp.id_kelas = ks.id_kelas
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN semester s ON s.id = mk.id_semester
      LEFT JOIN pengampu p ON p.id_kelas_praktikum = kp.id
      LEFT JOIN users lecturer ON lecturer.id = p.id_dosen
      LEFT JOIN jobsheets j
        ON j.id_mata_kuliah = mk.id
       AND j.status != 'UNPUBLISHED'
      LEFT JOIN jobsheet_classes jc
        ON jc.jobsheet_id = j.id
       AND jc.id_kelas_praktikum = kp.id
       AND jc.is_active = true
       AND jc.status = 'PUBLISHED'
      LEFT JOIN student_progress sp
        ON sp.student_id = km.id_mahasiswa
       AND sp.id_kelas_praktikum = kp.id
       AND sp.jobsheet_id = j.id
      WHERE km.id_mahasiswa = $1
        AND km.status = 'active'
        AND kp.status IN ('open', 'active')
      GROUP BY
        mk.id,
        kp.id,
        km.id,
        kp.legacy_class_id,
        mk.nama_mk,
        mk.kode_mk,
        s.semester,
        mk.sks,
        kp.status,
        mk.created_at
      ORDER BY s.semester ASC, mk.nama_mk ASC
      `,
      [studentId],
    );

    if (nativeResult.rows.length) return nativeResult.rows;

    // Legacy fallback only. Do not use for new academic flow.
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
        cl.id AS class_id,
        kp.id AS id_kelas_praktikum,
        kp.nama_kelas AS nama_kelas_praktikum,
        km.id AS id_kelas_mhs,
        cl.programming_language,
        u.fullname AS lecturer,
        COALESCE(ROUND(AVG(sp.progress)::numeric), 0)::int AS progress,
        COUNT(DISTINCT j.id)::int AS jobsheet_count
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      JOIN courses c ON c.id = cl.course_id
      LEFT JOIN kelas_praktikum kp ON kp.legacy_class_id = cl.id
      LEFT JOIN kelas_mhs km
        ON km.id_tahun_semester = kp.id_tahun_semester
       AND km.id_semester = kp.id_semester
       AND km.id_kelas = kp.id_kelas
       AND km.id_mahasiswa = cs.student_id
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
        cl.id,
        kp.id,
        kp.nama_kelas,
        km.id,
        cl.programming_language,
        u.fullname
      ORDER BY c.semester ASC, c.name ASC
      `,
      [studentId],
    );

    return result.rows;
  }

  async getCourseById(courseId) {
    const nativeResult = await this._pool.query(
      `
      SELECT
        mk.id,
        mk.id AS "mataKuliahId",
        mk.id AS id_mata_kuliah,
        mk.nama_mk AS name,
        mk.kode_mk AS code,
        '' AS description,
        s.semester,
        mk.sks,
        k.status,
        mk.created_at
      FROM mata_kuliah mk
      JOIN semester s ON s.id = mk.id_semester
      JOIN kurikulum k ON k.id = mk.id_kurikulum
      WHERE mk.id = $1 OR mk.legacy_course_id = $1
      LIMIT 1
      `,
      [courseId],
    );

    if (nativeResult.rows.length) return nativeResult.rows[0];

    // Legacy fallback only. Do not use for new academic flow.
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
