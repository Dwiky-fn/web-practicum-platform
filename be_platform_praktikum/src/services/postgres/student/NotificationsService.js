const pool = require('..');

class NotificationsService {
  constructor() {
    this._pool = pool;
    this._readNotifications = new Set();
    this._initTable();
  }

  async _initTable() {
    try {
      await this._pool.query(`
        CREATE TABLE IF NOT EXISTS user_notification_reads (
          user_id VARCHAR(255) NOT NULL,
          notification_id VARCHAR(255) NOT NULL,
          read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, notification_id)
        );
      `);
    } catch {
      // Graceful fallback
    }
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

    let dbReadIds = new Set();
    try {
      const readResult = await this._pool.query(
        'SELECT notification_id FROM user_notification_reads WHERE user_id = $1',
        [userId],
      );
      dbReadIds = new Set(readResult.rows.map((row) => row.notification_id));
    } catch {
      // Fallback
    }

    return items.map((item) => ({
      ...item,
      is_read: dbReadIds.has(item.id) || this._readNotifications.has(`${userId}:${item.id}`),
    }));
  }

  async markAsRead(userId, notificationId) {
    const items = await this.getNotifications(userId);
    const targetIds = notificationId
      ? [notificationId]
      : items.map((item) => item.id);

    for (const id of targetIds) {
      this._readNotifications.add(`${userId}:${id}`);
      try {
        await this._pool.query(
          `INSERT INTO user_notification_reads (user_id, notification_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, notification_id) DO NOTHING`,
          [userId, id],
        );
      } catch {
        // Ignore DB insert error
      }
    }
    return true;
  }

  async _getStudentNotifications(studentId) {
    const query = `
      SELECT *
      FROM (
        /* 1. Review Selesai / Revisi oleh Dosen */
        SELECT DISTINCT
          CONCAT('review-', ts.id, '-', sr.id) AS id,
          ts.student_id,
          CASE
            WHEN sr.decision = 'ACCEPTED' THEN 'Review Jobsheet Selesai'
            WHEN sr.decision = 'REVISION' THEN 'Revisi Jobsheet Diperlukan'
            ELSE 'Review Jobsheet Diperbarui'
          END AS title,
          CASE
            WHEN sr.decision = 'ACCEPTED'
              THEN CONCAT('Review jobsheet "', j.title, '" telah dipublish. Nilai akhir Anda: ', COALESCE(sr.final_score::text, '-'), '.')
            WHEN sr.decision = 'REVISION'
              THEN CONCAT('Review jobsheet "', j.title, '" telah dipublish dan membutuhkan revisi.')
            ELSE CONCAT('Review jobsheet "', j.title, '" telah diperbarui.')
          END AS message,
          CONCAT('/mata-kuliah/', mk.id, '/jobsheets/', j.id, '/review?mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id, '&submissionId=', ts.id) AS target_url,
          false AS is_read,
          COALESCE(ts.submitted_at, CURRENT_TIMESTAMP) AS sort_at
        FROM task_submissions ts
        JOIN submission_reviews sr ON sr.submission_id = ts.id
        JOIN jobsheets j ON j.id = ts.jobsheet_id
        JOIN kelas_praktikum kp ON kp.id = ts.id_kelas_praktikum
        JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
        WHERE ts.student_id = $1
          AND sr.decision IS NOT NULL
          AND sr.decision <> 'PENDING'

        UNION ALL

        /* 2. Pengingat Deadline Mendekati (Belum Submit & Deadline belum lewat) */
        SELECT DISTINCT
          CONCAT('deadline-near-', j.id, '-', kp.id) AS id,
          km.id_mahasiswa AS student_id,
          CASE
            WHEN jc.deadline < NOW() THEN 'Deadline Jobsheet Terlewat'
            WHEN jc.deadline <= NOW() + INTERVAL '24 hours' THEN '⚠️ Deadline Segera Berakhir (< 24 Jam)'
            WHEN jc.deadline <= NOW() + INTERVAL '3 days' THEN '⏳ Pengingat Deadline Jobsheet'
            ELSE 'Jadwal Tenggat Jobsheet'
          END AS title,
          CASE
            WHEN jc.deadline < NOW()
              THEN CONCAT('Deadline untuk jobsheet "', j.title, '" (', mk.nama_mk, ') telah terlewat pada ', to_char(jc.deadline, 'DD Mon YYYY HH24:MI'), '. Segera selesaikan pengerjaan Anda!')
            WHEN jc.deadline <= NOW() + INTERVAL '24 hours'
              THEN CONCAT('Tenggat waktu jobsheet "', j.title, '" (', mk.nama_mk, ') tersisa kurang dari 24 jam! Segera kumpulkan sebelum ', to_char(jc.deadline, 'HH24:MI'), '.')
            ELSE CONCAT('Jobsheet "', j.title, '" pada ', mk.nama_mk, ' memiliki tenggat waktu hingga ', to_char(jc.deadline, 'DD Mon YYYY HH24:MI'), '.')
          END AS message,
          CONCAT('/mata-kuliah/', mk.id, '/jobsheets/', j.id, '?mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id) AS target_url,
          false AS is_read,
          COALESCE(jc.deadline, CURRENT_TIMESTAMP) AS sort_at
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
        LEFT JOIN task_submissions ts
          ON ts.student_id = km.id_mahasiswa
         AND ts.id_kelas_praktikum = kp.id
         AND ts.jobsheet_id = j.id
        WHERE km.id_mahasiswa = $1
          AND LOWER(COALESCE(km.status, 'active')) = 'active'
          AND LOWER(COALESCE(kp.status, 'open')) IN ('open', 'active')
          AND j.status = 'PUBLISHED'
          AND jc.deadline IS NOT NULL
          AND (ts.id IS NULL OR ts.status NOT IN ('SUBMITTED', 'REVIEWED'))

        UNION ALL

        /* 3. Jobsheet Baru Diterbitkan */
        SELECT DISTINCT
          CONCAT('j-', j.id) AS id,
          km.id_mahasiswa AS student_id,
          'Jobsheet Baru Tersedia' AS title,
          CONCAT('Jobsheet "', j.title, '" telah dipublish untuk mata kuliah ', mk.nama_mk, '.') AS message,
          CONCAT('/mata-kuliah/', mk.id, '/jobsheets/', j.id, '?mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id) AS target_url,
          false AS is_read,
          CURRENT_TIMESTAMP AS sort_at
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
      ) notifications
      ORDER BY sort_at DESC, id ASC
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
        SELECT * FROM (
          /* 1. Laporan Mahasiswa Menunggu Penilaian */
          SELECT DISTINCT
            CONCAT('pending-', kp.id, '-', ts.id) AS id,
            $1 AS student_id,
            'Laporan Menunggu Evaluasi' AS title,
            CONCAT('Mahasiswa ', COALESCE(prof.fullname, u.email), ' telah mengumpulkan laporan pada ', mk.nama_mk, ' (Kelas ', k.kelas, ').') AS message,
            CONCAT('/reviews/', u.id, '?courseId=', mk.id, '&classId=', kp.id, '&jobsheetId=', jc.jobsheet_id, '&mataKuliahId=', mk.id, '&kelasPraktikumId=', kp.id, '&from=class-evaluation') AS target_url,
            false AS is_read,
            COALESCE(ts.submitted_at, CURRENT_TIMESTAMP) AS sort_at
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

          UNION ALL

          /* 2. Draft Jobsheet Belum Dipublish */
          SELECT DISTINCT
            CONCAT('draft-j-', j.id) AS id,
            $1 AS student_id,
            'Draft Jobsheet Belum Dipublish' AS title,
            CONCAT('Jobsheet "', j.title, '" (', mk.nama_mk, ') masih berstatus Draft. Jangan lupa mempublikasikan jika siap digunakan.') AS message,
            CONCAT('/mata-kuliah/', mk.id, '/jobsheets/', j.id, '/edit') AS target_url,
            false AS is_read,
            CURRENT_TIMESTAMP AS sort_at
          FROM pengampu p
          JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
          JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
          JOIN jobsheets j ON j.id_mata_kuliah = mk.id
          WHERE p.id_dosen = $1
            AND j.status = 'DRAFT'
        ) lecturer_notifs
        ORDER BY sort_at DESC, id ASC
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
