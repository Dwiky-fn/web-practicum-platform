const pool = require('..');

class NotificationsService {
  constructor() {
    this._pool = pool;
    this._readNotifications = new Set();
  }

  async getNotifications(userId) {
    const userResult = await this._pool.query(
      'SELECT id, role, email FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );

    if (!userResult.rows.length) {
      return [];
    }

    const user = userResult.rows[0];
    let items = [];

    if (user.role === 'MAHASISWA') {
      items = await this._getStudentNotifications(userId);
    } else if (user.role === 'DOSEN') {
      items = await this._getLecturerNotifications(userId);
    } else if (user.role === 'ADMIN') {
      items = await this._getAdminNotifications(userId);
    }

    return items.map((item) => ({
      ...item,
      is_read: this._readNotifications.has(`${userId}:${item.id}`),
    }));
  }

  async markAsRead(userId) {
    const items = await this.getNotifications(userId);
    for (const item of items) {
      this._readNotifications.add(`${userId}:${item.id}`);
    }
    return true;
  }

  async _getStudentNotifications(studentId) {
    const query = `
      SELECT DISTINCT
        CONCAT('j-', j.id) AS id,
        km.id_mahasiswa AS student_id,
        'Jobsheet Baru Tersedia' AS title,
        CONCAT('Jobsheet "', j.title, '" telah dipublish untuk mata kuliah ', mk.nama_mk, '.') AS message,
        CONCAT('/mata-kuliah/', mk.id, '/jobsheets/', j.id, '?mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id) AS target_url,
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
      ORDER BY id ASC
      LIMIT 10
    `;
    try {
      const result = await this._pool.query(query, [studentId]);
      return result.rows;
    } catch {
      return [];
    }
  }

  async _getLecturerNotifications(lecturerId) {
    try {
      const query = `
        SELECT DISTINCT
          CONCAT('pending-', kp.id, '-', ts.id) AS id,
          $1 AS student_id,
          'Laporan Menunggu Evaluasi' AS title,
          CONCAT('Mahasiswa ', COALESCE(prof.fullname, u.email), ' telah mengumpulkan laporan pada ', mk.nama_mk, ' (Kelas ', k.kelas, ').') AS message,
          CONCAT('/reviews/', u.id, '?courseId=', mk.id, '&classId=', kp.id, '&jobsheetId=', jc.jobsheet_id, '&mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id, '&from=class-evaluation') AS target_url,
          false AS is_read
        FROM pengampu p
        JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
        JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
        JOIN master_kelas k ON k.id = kp.id_kelas
        JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
        JOIN task_submissions ts ON ts.id_kelas_praktikum = kp.id AND ts.jobsheet_id = jc.jobsheet_id
        JOIN users u ON u.id = ts.student_id
        LEFT JOIN profiles prof ON prof.user_id = u.id
        WHERE p.id_dosen = $1
          AND ts.status IN ('SUBMITTED', 'REVIEWING')
        ORDER BY id ASC
        LIMIT 10
      `;
      const result = await this._pool.query(query, [lecturerId]);
      if (result.rows.length) return result.rows;
    } catch {
      // Fallback
    }

    try {
      const summaryResult = await this._pool.query(
        `
        SELECT DISTINCT
          CONCAT('dosen-summary-', kp.id) AS id,
          $1 AS student_id,
          'Monitoring Kelas Praktikum' AS title,
          CONCAT('Anda mengampu kelas praktikum ', mk.nama_mk, ' (Kelas ', k.kelas, '). Pantau progres pengerjaan mahasiswa secara real-time.') AS message,
          CONCAT('/kelas-praktikum/', mk.id, '/', kp.id) AS target_url,
          false AS is_read
        FROM pengampu p
        JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
        JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
        JOIN master_kelas k ON k.id = kp.id_kelas
        WHERE p.id_dosen = $1
        LIMIT 5
        `,
        [lecturerId],
      );
      return summaryResult.rows;
    } catch {
      return [];
    }
  }

  async _getAdminNotifications(adminId) {
    try {
      const query = `
        SELECT DISTINCT
          CONCAT('admin-kp-', kp.id) AS id,
          $1 AS student_id,
          'Kelas Membutuhkan Dosen' AS title,
          CONCAT('Kelas praktikum ', mk.nama_mk, ' (Kelas ', k.kelas, ') belum memiliki pengampu.') AS message,
          '/admin/academic/kelas-praktikum' AS target_url,
          false AS is_read
        FROM kelas_praktikum kp
        JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
        JOIN master_kelas k ON k.id = kp.id_kelas
        LEFT JOIN pengampu p ON p.id_kelas_praktikum = kp.id
        WHERE p.id IS NULL
        LIMIT 5
      `;
      const result = await this._pool.query(query, [adminId]);
      if (result.rows.length) return result.rows;
    } catch {
      // Fallback
    }

    try {
      const systemResult = await this._pool.query(
        `
        SELECT
          'admin-sys-1' AS id,
          $1 AS student_id,
          'Status Akademik System' AS title,
          CONCAT('Tahun semester aktif terkonfigurasi. Total ', (SELECT COUNT(*) FROM users WHERE role = 'MAHASISWA' AND is_active = true), ' mahasiswa aktif dan ', (SELECT COUNT(*) FROM users WHERE role = 'DOSEN' AND is_active = true), ' dosen aktif.') AS message,
          '/admin/academic/tahun-semester' AS target_url,
          false AS is_read
        `,
        [adminId],
      );
      return systemResult.rows;
    } catch {
      return [];
    }
  }
}

module.exports = NotificationsService;
