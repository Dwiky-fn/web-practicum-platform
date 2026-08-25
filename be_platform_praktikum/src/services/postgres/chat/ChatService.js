const { nanoid } = require('nanoid');
const InvariantError = require('../../../exceptions/InvariantError');
const NotFoundError = require('../../../exceptions/NotFoundError');
const AuthorizationError = require('../../../exceptions/AuthorizationError');

class ChatService {
  constructor(pool) {
    this._pool = pool;
  }

  async resolvePrimaryLecturer(kelasPraktikumId) {
    const query = {
      text: `
        SELECT p.id_dosen
        FROM pengampu p
        WHERE p.id_kelas_praktikum = $1
        ORDER BY CASE WHEN LOWER(COALESCE(p.peran, '')) = 'utama' THEN 0 ELSE 1 END ASC, p.created_at ASC
        LIMIT 1
      `,
      values: [kelasPraktikumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Dosen pengampu tidak ditemukan untuk kelas praktikum ini');
    }
    return result.rows[0].id_dosen;
  }

  async verifyStudentAccess(studentId, kelasPraktikumId) {
    const query = {
      text: `
        SELECT 1
        FROM kelas_mhs km
        JOIN kelas_praktikum kp
          ON kp.id_tahun_semester = km.id_tahun_semester
         AND kp.id_semester = km.id_semester
         AND kp.id_kelas = km.id_kelas
        WHERE km.id_mahasiswa = $1 AND kp.id = $2
        LIMIT 1
      `,
      values: [studentId, kelasPraktikumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new AuthorizationError('Mahasiswa tidak terdaftar pada kelas praktikum ini');
    }
  }

  async verifyLecturerAccess(lecturerId, kelasPraktikumId) {
    const query = {
      text: `
        SELECT 1
        FROM pengampu
        WHERE id_dosen = $1 AND id_kelas_praktikum = $2
        LIMIT 1
      `,
      values: [lecturerId, kelasPraktikumId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new AuthorizationError('Dosen tidak mengampu kelas praktikum ini');
    }
  }

  async getOrCreateConversation({ studentId, lecturerId, kelasPraktikumId, jobsheetId, requestingUser }) {
    let finalKelasPraktikumId = kelasPraktikumId;
    let finalJobsheetId = jobsheetId;

    if (!finalKelasPraktikumId) {
      throw new InvariantError('Kelas praktikum belum ditentukan untuk percakapan ini');
    }

    if (!finalJobsheetId) {
      const resolveQuery = {
        text: `
          SELECT jc.jobsheet_id AS jobsheet_id
          FROM jobsheet_classes jc
          WHERE jc.id_kelas_praktikum = $1 AND jc.is_active = true
          ORDER BY jc.created_at ASC
          LIMIT 1
        `,
        values: [finalKelasPraktikumId],
      };
      const resolveRes = await this._pool.query(resolveQuery);
      if (resolveRes.rows.length) {
        finalJobsheetId = resolveRes.rows[0].jobsheet_id;
      } else {
        throw new InvariantError('Percakapan belum dapat dibuka karena belum ada jobsheet aktif pada kelas ini');
      }
    }

    let finalStudentId = studentId;
    let finalLecturerId = lecturerId;

    if (requestingUser.role === 'MAHASISWA') {
      finalStudentId = requestingUser.id;
      if (!finalLecturerId) {
        finalLecturerId = await this.resolvePrimaryLecturer(finalKelasPraktikumId);
      }
      await this.verifyStudentAccess(finalStudentId, finalKelasPraktikumId);
    } else if (requestingUser.role === 'DOSEN') {
      finalLecturerId = requestingUser.id;
      if (!finalStudentId) {
        throw new InvariantError('Mahasiswa tujuan belum dipilih');
      }
      await this.verifyLecturerAccess(finalLecturerId, finalKelasPraktikumId);
    } else if (requestingUser.role === 'ADMIN') {
      if (!finalStudentId || !finalLecturerId) {
        throw new InvariantError('studentId dan lecturerId wajib ditentukan');
      }
    }

    const findQuery = {
      text: `
        SELECT c.*,
               s.fullname AS student_name, s.avatar_url AS student_avatar,
               l.fullname AS lecturer_name, l.avatar_url AS lecturer_avatar
        FROM chat_conversations c
        JOIN users s ON s.id = c.student_id
        JOIN users l ON l.id = c.lecturer_id
        WHERE c.student_id = $1
          AND c.lecturer_id = $2
          AND c.kelas_praktikum_id = $3
          AND c.jobsheet_id = $4
        LIMIT 1
      `,
      values: [finalStudentId, finalLecturerId, finalKelasPraktikumId, finalJobsheetId],
    };
    const existing = await this._pool.query(findQuery);
    if (existing.rows.length) {
      return existing.rows[0];
    }

    const id = `conv-${nanoid(16)}`;
    const insertQuery = {
      text: `
        INSERT INTO chat_conversations (id, student_id, lecturer_id, kelas_praktikum_id, jobsheet_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_id, lecturer_id, kelas_praktikum_id, jobsheet_id)
        DO UPDATE SET updated_at = NOW()
        RETURNING *
      `,
      values: [id, finalStudentId, finalLecturerId, kelasPraktikumId, jobsheetId],
    };
    const result = await this._pool.query(insertQuery);
    return this.getOrCreateConversation({
      studentId: finalStudentId,
      lecturerId: finalLecturerId,
      kelasPraktikumId,
      jobsheetId,
      requestingUser,
    });
  }

  async verifyConversationParticipant(conversationId, userId) {
    const query = {
      text: 'SELECT * FROM chat_conversations WHERE id = $1 LIMIT 1',
      values: [conversationId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Percakapan chat tidak ditemukan');
    }
    const conv = result.rows[0];
    if (conv.student_id !== userId && conv.lecturer_id !== userId) {
      throw new AuthorizationError('Anda tidak memiliki akses ke percakapan chat ini');
    }
    return conv;
  }

  async getLecturerConversations({ lecturerId, kelasPraktikumId, jobsheetId }) {
    if (kelasPraktikumId) {
      await this.verifyLecturerAccess(lecturerId, kelasPraktikumId);
    }

    let queryText = `
      SELECT c.*,
             u.fullname AS student_name,
             spf.nim AS student_nim,
             u.avatar_url AS student_avatar,
             (
               SELECT message FROM chat_messages m
               WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC LIMIT 1
             ) AS last_message,
             (
               SELECT COUNT(*)::int FROM chat_messages m
               WHERE m.conversation_id = c.id
                 AND m.sender_id != $1
                 AND m.read_at IS NULL
             ) AS unread_count
      FROM chat_conversations c
      JOIN users u ON u.id = c.student_id
      LEFT JOIN student_profiles spf ON spf.user_id = u.id
      WHERE c.lecturer_id = $1
    `;

    const values = [lecturerId];

    if (kelasPraktikumId) {
      values.push(kelasPraktikumId);
      queryText += ` AND c.kelas_praktikum_id = $${values.length}`;
    }

    if (jobsheetId) {
      values.push(jobsheetId);
      queryText += ` AND c.jobsheet_id = $${values.length}`;
    }

    queryText += ` ORDER BY c.last_message_at DESC`;

    const result = await this._pool.query({ text: queryText, values });
    return result.rows;
  }

  async getEligibleStudents({ lecturerId, search }) {
    let queryText = `
      SELECT DISTINCT
        u.id,
        u.fullname AS name,
        u.avatar_url AS avatar_url,
        spf.nim AS nim,
        kp.id AS kelas_praktikum_id,
        mk.nama_mk AS mata_kuliah_nama,
        k.kelas AS kelas_nama
      FROM pengampu p
      JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN kelas k ON k.id = kp.id_kelas
      JOIN kelas_mhs km ON km.id_tahun_semester = kp.id_tahun_semester
                       AND km.id_semester = kp.id_semester
                       AND km.id_kelas = kp.id_kelas
                       AND km.status = 'active'
      JOIN users u ON u.id = km.id_mahasiswa AND u.is_active = true
      LEFT JOIN student_profiles spf ON spf.user_id = u.id
      WHERE p.id_dosen = $1
    `;

    const values = [lecturerId];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      queryText += ` AND (LOWER(u.fullname) LIKE $2 OR LOWER(COALESCE(spf.nim, '')) LIKE $2)`;
    }

    queryText += ` ORDER BY u.fullname ASC LIMIT 100`;

    const result = await this._pool.query({ text: queryText, values });
    return result.rows;
  }

  async getLecturerClassesWithCount({ lecturerId }) {
    const queryText = `
      SELECT
        kp.id AS kelas_praktikum_id,
        mk.nama_mk AS mata_kuliah_nama,
        k.kelas AS kelas_nama,
        kp.nama_kelas,
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM chat_conversations c
            JOIN chat_messages m ON m.conversation_id = c.id
            WHERE c.kelas_praktikum_id = kp.id
              AND c.lecturer_id = p.id_dosen
              AND m.sender_id = c.student_id
              AND m.read_at IS NULL
          ), 0
        )::int AS unread_count
      FROM pengampu p
      JOIN kelas_praktikum kp ON kp.id = p.id_kelas_praktikum
      JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
      JOIN kelas k ON k.id = kp.id_kelas
      WHERE p.id_dosen = $1
      ORDER BY kp.nama_kelas ASC
    `;
    const result = await this._pool.query({ text: queryText, values: [lecturerId] });
    return result.rows;
  }

  async getLecturerJobsheetsWithCount({ lecturerId, kelasPraktikumId }) {
    await this.verifyLecturerAccess(lecturerId, kelasPraktikumId);
    const queryText = `
      SELECT
        COALESCE(jc.jobsheet_id, j.id) AS jobsheet_id,
        COALESCE(jc.title, j.title) AS jobsheet_title,
        jc.id_kelas_praktikum,
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM chat_conversations c
            JOIN chat_messages m ON m.conversation_id = c.id
            WHERE c.kelas_praktikum_id = jc.id_kelas_praktikum
              AND c.jobsheet_id = COALESCE(jc.jobsheet_id, j.id)
              AND c.lecturer_id = $1
              AND m.sender_id = c.student_id
              AND m.read_at IS NULL
          ), 0
        )::int AS unread_count
      FROM jobsheet_classes jc
      JOIN jobsheets j ON j.id = jc.jobsheet_id
      WHERE jc.id_kelas_praktikum = $2 AND jc.is_active = true
      ORDER BY jc.created_at ASC
    `;
    const result = await this._pool.query({ text: queryText, values: [lecturerId, kelasPraktikumId] });
    return result.rows;
  }

  async getLecturerStudentsWithCount({ lecturerId, kelasPraktikumId, jobsheetId }) {
    await this.verifyLecturerAccess(lecturerId, kelasPraktikumId);
    const queryText = `
      SELECT
        c.id AS conversation_id,
        u.id AS student_id,
        u.fullname AS student_name,
        spf.nim AS student_nim,
        u.avatar_url AS student_avatar,
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM chat_messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id = c.student_id
              AND m.read_at IS NULL
          ), 0
        )::int AS unread_count,
        (
          SELECT MAX(m.created_at)
          FROM chat_messages m
          WHERE m.conversation_id = c.id
        ) AS last_message_at
      FROM chat_conversations c
      JOIN users u ON u.id = c.student_id
      LEFT JOIN student_profiles spf ON spf.user_id = u.id
      WHERE c.kelas_praktikum_id = $1
        AND c.jobsheet_id = $2
        AND c.lecturer_id = $3
        AND EXISTS (
          SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id
        )
      ORDER BY last_message_at DESC NULLS LAST
    `;
    const result = await this._pool.query({ text: queryText, values: [kelasPraktikumId, jobsheetId, lecturerId] });
    return result.rows;
  }

  async getMessages({ conversationId, userId, limit = 50, before }) {
    await this.verifyConversationParticipant(conversationId, userId);

    let queryText = `
      SELECT m.*, u.fullname AS sender_name, u.role AS sender_role, u.avatar_url AS sender_avatar
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
    `;
    const params = [conversationId];

    if (before) {
      params.push(before);
      queryText += ` AND m.created_at < $${params.length}`;
    }

    params.push(Math.min(limit, 100));
    queryText += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

    const result = await this._pool.query({ text: queryText, values: params });
    return result.rows.reverse();
  }

  async sendMessage({ conversationId, senderId, message, clientMessageId }) {
    if (!message || typeof message !== 'string') {
      throw new InvariantError('Pesan tidak boleh kosong');
    }
    const trimmed = message.trim();
    if (!trimmed) {
      throw new InvariantError('Pesan tidak boleh kosong');
    }
    if (trimmed.length > 2000) {
      throw new InvariantError('Pesan tidak boleh melebihi 2000 karakter');
    }

    const conv = await this.verifyConversationParticipant(conversationId, senderId);

    const msgId = `msg-${nanoid(16)}`;
    const insertQuery = {
      text: `
        INSERT INTO chat_messages (id, conversation_id, sender_id, client_message_id, message)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (conversation_id, client_message_id) WHERE client_message_id IS NOT NULL
        DO UPDATE SET message = EXCLUDED.message
        RETURNING *
      `,
      values: [msgId, conversationId, senderId, clientMessageId || null, trimmed],
    };
    const msgResult = await this._pool.query(insertQuery);
    const msg = msgResult.rows[0];

    await this._pool.query({
      text: 'UPDATE chat_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1',
      values: [conversationId],
    });

    const senderResult = await this._pool.query({
      text: 'SELECT fullname, role, avatar_url FROM users WHERE id = $1',
      values: [senderId],
    });
    const sender = senderResult.rows[0] || {};

    return {
      ...msg,
      conversation: conv,
      sender_name: sender.fullname,
      sender_role: sender.role,
      sender_avatar: sender.avatar_url,
    };
  }

  async markAsRead({ conversationId, userId }) {
    await this.verifyConversationParticipant(conversationId, userId);

    const query = {
      text: `
        UPDATE chat_messages
        SET read_at = NOW()
        WHERE conversation_id = $1
          AND sender_id != $2
          AND read_at IS NULL
        RETURNING id
      `,
      values: [conversationId, userId],
    };
    const result = await this._pool.query(query);
    return { updatedCount: result.rows.length };
  }

  async getUnreadCounts({ userId, role, kelasPraktikumId, jobsheetId }) {
    if (role === 'MAHASISWA') {
      const query = {
        text: `
          SELECT COUNT(m.id)::int AS unread_count
          FROM chat_conversations c
          JOIN chat_messages m ON m.conversation_id = c.id
          WHERE c.student_id = $1
            AND m.sender_id != $1
            AND m.read_at IS NULL
            ${kelasPraktikumId ? 'AND c.kelas_praktikum_id = $2' : ''}
            ${jobsheetId ? `AND c.jobsheet_id = $${kelasPraktikumId ? 3 : 2}` : ''}
        `,
        values: [userId, kelasPraktikumId, jobsheetId].filter(Boolean),
      };
      const res = await this._pool.query(query);
      return { totalUnread: res.rows[0]?.unread_count || 0 };
    }

    if (role === 'DOSEN') {
      const query = {
        text: `
          SELECT c.kelas_praktikum_id, c.jobsheet_id, c.student_id, COUNT(m.id)::int AS unread_count
          FROM chat_conversations c
          JOIN chat_messages m ON m.conversation_id = c.id
          WHERE c.lecturer_id = $1
            AND m.sender_id != $1
            AND m.read_at IS NULL
            ${kelasPraktikumId ? 'AND c.kelas_praktikum_id = $2' : ''}
            ${jobsheetId ? `AND c.jobsheet_id = $${kelasPraktikumId ? 3 : 2}` : ''}
          GROUP BY c.kelas_praktikum_id, c.jobsheet_id, c.student_id
        `,
        values: [userId, kelasPraktikumId, jobsheetId].filter(Boolean),
      };
      const res = await this._pool.query(query);
      const studentUnreadMap = {};
      let totalUnread = 0;
      res.rows.forEach((r) => {
        studentUnreadMap[r.student_id] = r.unread_count;
        totalUnread += r.unread_count;
      });
      return { totalUnread, studentUnreadMap };
    }

    return { totalUnread: 0 };
  }
}

module.exports = ChatService;
