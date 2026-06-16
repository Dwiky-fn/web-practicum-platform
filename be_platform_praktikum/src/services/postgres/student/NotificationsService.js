const pool = require('..');

class NotificationsService {
  constructor() {
    this._pool = pool;
  }

  async getNotifications(studentId) {
    const nativeResult = await this._pool.query(
      `
      SELECT DISTINCT
        j.id,
        km.id_mahasiswa AS student_id,
        'Jobsheet Aktif' AS title,
        CONCAT(j.title, ' tersedia pada ', mk.nama_mk, '.') AS message,
        false AS is_read
      FROM kelas_mhs km
      JOIN kelas_praktikum kp
        ON kp.id_tahun_semester = km.id_tahun_semester
       AND kp.id_semester = km.id_semester
       AND kp.id_kelas = km.id_kelas
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN jobsheet_classes jc
        ON jc.id_kelas_praktikum = kp.id
       AND jc.is_active = true
      JOIN jobsheets j
        ON j.id = jc.jobsheet_id
       AND j.id_mata_kuliah = kp.id_mata_kuliah
      LEFT JOIN student_progress sp
        ON sp.student_id = km.id_mahasiswa
       AND sp.id_kelas_praktikum = kp.id
       AND sp.jobsheet_id = j.id
      WHERE km.id_mahasiswa = $1
        AND LOWER(COALESCE(km.status, 'active')) = 'active'
        AND LOWER(COALESCE(kp.status, 'open')) IN ('open', 'active')
        AND j.status = 'PUBLISHED'
        AND COALESCE(sp.progress, 0) < 100
      ORDER BY j.id ASC
      LIMIT 10
      `,
      [studentId],
    );

    if (nativeResult.rows.length) return nativeResult.rows;

    // Legacy fallback only. New academic flow should use kelas_mhs/kelas_praktikum above.
    const result = await this._pool.query(
      `
      SELECT DISTINCT
        j.id,
        cs.student_id,
        'Jobsheet Aktif' AS title,
        CONCAT(j.title, ' tersedia pada ', c.name, '.') AS message,
        false AS is_read
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      JOIN courses c ON c.id = cl.course_id
      JOIN jobsheets j ON j.course_id = c.id
      LEFT JOIN student_progress sp
        ON sp.student_id = cs.student_id
       AND sp.class_id = cl.id
       AND sp.jobsheet_id = j.id
      WHERE cs.student_id = $1
        AND cs.status = 'AKTIF'
        AND cl.status = 'AKTIF'
        AND c.status = 'AKTIF'
        AND j.status = 'PUBLISHED'
        AND COALESCE(sp.progress, 0) < 100
      ORDER BY j.id ASC
      LIMIT 10
      `,
      [studentId],
    );

    return result.rows;
  }
}

module.exports = NotificationsService;
