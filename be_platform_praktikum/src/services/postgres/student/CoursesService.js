const pool = require('..');

class CoursesService {
  constructor() {
    this._pool = pool;
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

    return nativeResult.rows;
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

    return nativeResult.rows;
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
      WHERE mk.id = $1
      LIMIT 1
      `,
      [courseId],
    );

    if (!nativeResult.rows.length) {
      throw new Error('COURSE_NOT_FOUND');
    }

    return nativeResult.rows[0];
  }
}

module.exports = CoursesService;
