const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('.');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compareBcrypt(password, hash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

function hashBcrypt(password, saltRounds = 10) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (error, hash) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(hash);
    });
  });
}

class UsersService {
  constructor() {
    this._pool = pool;
  }

  async login(payload) {
    const identifier = (
      payload.identifier ||
      payload.email ||
      payload.nim ||
      ''
    ).trim();
    const { password } = payload;

    if (!identifier) {
      throw new Error('LOGIN_IDENTIFIER_REQUIRED');
    }

    if (!password) {
      throw new Error('LOGIN_PASSWORD_REQUIRED');
    }

    const result = await this._pool.query(
      `SELECT u.id, u.password, u.is_active
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
        OR sp.nim = $1
       LIMIT 1`,
      [identifier],
    );

    if (!result.rows.length) {
      throw new Error('LOGIN_INVALID');
    }

    const account = result.rows[0];

    if (!account.is_active) {
      throw new Error('USER_INACTIVE');
    }

    if (!account.password) {
      throw new Error('LOGIN_INVALID');
    }

    const validPassword = await compareBcrypt(password, account.password);

    if (!validPassword) {
      throw new Error('LOGIN_INVALID');
    }

    return {
      token: crypto.randomBytes(32).toString('hex'),
      user: await this.getUserById(account.id),
    };
  }

  async getUserById(userId) {
    const result = await this._pool.query(
      `SELECT 
        u.id,
        u.fullname,
        u.fullname AS full_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        -- Student Profile
        sp.nim,
        sp.program_studi,
        sp.jurusan,
        sp.angkatan,
        sp.semester,
        sp.status,
        sp.status AS student_status,
        sp.avatar_url,
        sp.no_telepon,
        sp.tempat_lahir,
        sp.tanggal_lahir,
        sp.kota,
        -- Lecturer Profile
        lp.nip,
        lp.avatar_url AS lp_avatar_url,
        lp.no_telepon AS lp_no_telepon,
        lp.tempat_lahir AS lp_tempat_lahir,
        lp.tanggal_lahir AS lp_tanggal_lahir,
        lp.kota AS lp_kota
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
      WHERE u.id = $1`,
      [userId],
    );

    if (!result.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const row = result.rows[0];

    // Normalize: ambil avatar & personal data dari profil yang sesuai role
    if (row.role === 'DOSEN') {
      row.avatar_url = row.lp_avatar_url;
      row.no_telepon = row.lp_no_telepon;
      row.tempat_lahir = row.lp_tempat_lahir;
      row.tanggal_lahir = row.lp_tanggal_lahir;
      row.kota = row.lp_kota;
    }

    return row;
  }

  async updateUser(userId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [userId],
      );

      if (!currentResult.rows.length) {
        throw new Error('USER_NOT_FOUND');
      }

      const role = currentResult.rows[0].role;
      const personalData = payload.personalData || payload.personal_data || {};

      await client.query(
        `UPDATE users
         SET
          is_active = COALESCE($2, is_active)
         WHERE id = $1`,
        [
          userId,
          typeof payload.isActive === 'boolean' ? payload.isActive : null,
        ],
      );

      if (role === 'MAHASISWA') {
        await client.query(
          `UPDATE student_profiles
           SET
            avatar_url = COALESCE($2, avatar_url),
            no_telepon = COALESCE($3, no_telepon),
            tempat_lahir = COALESCE($4, tempat_lahir),
            tanggal_lahir = COALESCE($5, tanggal_lahir),
            kota = COALESCE($6, kota)
           WHERE user_id = $1`,
          [
            userId,
            payload.avatarUrl ?? payload.avatar_url ?? null,
            personalData.no_telepon ?? null,
            personalData.tempat_lahir ?? null,
            personalData.tanggal_lahir || null,
            personalData.kota ?? null,
          ],
        );
      }

      if (role === 'DOSEN') {
        await client.query(
          `UPDATE lecturer_profiles
           SET
            avatar_url = COALESCE($2, avatar_url),
            no_telepon = COALESCE($3, no_telepon),
            tempat_lahir = COALESCE($4, tempat_lahir),
            tanggal_lahir = COALESCE($5, tanggal_lahir),
            kota = COALESCE($6, kota)
           WHERE user_id = $1`,
          [
            userId,
            payload.avatarUrl ?? payload.avatar_url ?? null,
            personalData.no_telepon ?? null,
            personalData.tempat_lahir ?? null,
            personalData.tanggal_lahir || null,
            personalData.kota ?? null,
          ],
        );
      }

      await client.query('COMMIT');

      return this.getUserById(userId);
    } catch (error) {
      await client.query('ROLLBACK');

      if (error.code === '23505') {
        throw new Error('USER_DUPLICATE');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async updateEmail(userId, payload) {
    const newEmail = payload.email?.trim().toLowerCase();
    const currentPassword = payload.currentPassword || payload.current_password;

    if (!newEmail) {
      throw new Error('EMAIL_REQUIRED');
    }

    if (!EMAIL_PATTERN.test(newEmail)) {
      throw new Error('EMAIL_INVALID');
    }

    if (!currentPassword) {
      throw new Error('CURRENT_PASSWORD_REQUIRED');
    }

    const userResult = await this._pool.query(
      'SELECT id, email, password FROM users WHERE id = $1',
      [userId],
    );

    if (!userResult.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    if (user.email.toLowerCase() === newEmail) {
      throw new Error('EMAIL_SAME');
    }

    const validPassword = await compareBcrypt(currentPassword, user.password);

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    try {
      // TODO: Tambahkan OTP verifikasi email baru sebelum update email.
      await this._pool.query(
        'UPDATE users SET email = $2 WHERE id = $1',
        [userId, newEmail],
      );
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('EMAIL_DUPLICATE');
      }

      throw error;
    }

    return this.getUserById(userId);
  }

  async updatePassword(userId, payload) {
    const currentPassword = payload.currentPassword || payload.current_password;
    const newPassword = payload.newPassword || payload.new_password;
    const confirmPassword = payload.confirmPassword || payload.confirm_password;

    if (!currentPassword) {
      throw new Error('CURRENT_PASSWORD_REQUIRED');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('NEW_PASSWORD_INVALID');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('PASSWORD_CONFIRM_MISMATCH');
    }

    const userResult = await this._pool.query(
      'SELECT id, password FROM users WHERE id = $1',
      [userId],
    );

    if (!userResult.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const validPassword = await compareBcrypt(
      currentPassword,
      userResult.rows[0].password,
    );

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    const hashedPassword = await hashBcrypt(newPassword, 10);

    await this._pool.query(
      'UPDATE users SET password = $2 WHERE id = $1',
      [userId, hashedPassword],
    );

    return this.getUserById(userId);
  }

  async updateAvatarUrl(userId, avatarUrl) {
    const currentResult = await this._pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId],
    );

    if (!currentResult.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const role = currentResult.rows[0].role;

    if (role === 'MAHASISWA') {
      await this._pool.query(
        `UPDATE student_profiles
         SET avatar_url = $2
         WHERE user_id = $1`,
        [userId, avatarUrl],
      );
    }

    if (role === 'DOSEN') {
      await this._pool.query(
        `UPDATE lecturer_profiles
         SET avatar_url = $2
         WHERE user_id = $1`,
        [userId, avatarUrl],
      );
    }

    return this.getUserById(userId);
  }

  async deactivateUser(userId) {
    const result = await this._pool.query(
      `UPDATE users
       SET is_active = false
       WHERE id = $1
       RETURNING id`,
      [userId],
    );

    if (!result.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }
  }
}

module.exports = UsersService;
