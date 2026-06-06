const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('.');
const GoogleService = require('../auth/GoogleService');
const MailService = require('../mail/MailService');
const TokenService = require('../auth/TokenService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

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

async function verifyPassword(password, storedPassword) {
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return compareBcrypt(password, storedPassword);
  }

  return password === storedPassword;
}

class UsersService {
  constructor() {
    this._pool = pool;
    this._googleService = new GoogleService();
    this._mailService = new MailService();
    this._tokenService = new TokenService();
  }

  _generateToken(user) {
    return this._tokenService.sign(user);
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
        OR (u.role = 'MAHASISWA' AND sp.nim = $1)
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

    const validPassword = await verifyPassword(password, account.password);

    if (!validPassword) {
      throw new Error('LOGIN_INVALID');
    }

    const user = await this.getUserById(account.id);

    return {
      token: this._generateToken(user),
      user,
    };
  }

  async loginWithGoogle(payload) {
    const googleUser = await this._googleService.verifyCredential(
      payload.credential,
    );

    const result = await this._pool.query(
      `SELECT id, role, is_active
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
      [googleUser.email],
    );

    if (!result.rows.length) {
      throw new Error('GOOGLE_ACCOUNT_NOT_REGISTERED');
    }

    const account = result.rows[0];

    if (!account.is_active) {
      throw new Error('USER_INACTIVE');
    }

    await this._updateAvatarFromGoogleIfEmpty(
      account.id,
      account.role,
      googleUser.avatarUrl,
    );

    const user = await this.getUserById(account.id);

    return {
      token: this._generateToken(user),
      user,
    };
  }

  async _updateAvatarFromGoogleIfEmpty(userId, role, avatarUrl) {
    if (!avatarUrl) {
      return;
    }

    if (role === 'MAHASISWA') {
      await this._pool.query(
        `UPDATE student_profiles
       SET avatar_url = COALESCE(avatar_url, $2)
       WHERE user_id = $1`,
        [userId, avatarUrl],
      );
    }

    if (role === 'DOSEN') {
      await this._pool.query(
        `UPDATE lecturer_profiles
       SET avatar_url = COALESCE(avatar_url, $2)
       WHERE user_id = $1`,
        [userId, avatarUrl],
      );
    }
  }

  async requestUpdateEmailOtp(userId, payload) {
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

    const validPassword = await verifyPassword(currentPassword, user.password);

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    const duplicateResult = await this._pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      [newEmail, userId],
    );

    if (duplicateResult.rows.length) {
      throw new Error('EMAIL_DUPLICATE');
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await this._pool.query('DELETE FROM email_change_otps WHERE user_id = $1', [
      userId,
    ]);

    await this._pool.query(
      `INSERT INTO email_change_otps
      (user_id, new_email, otp_hash, expires_at)
     VALUES
      ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
      [userId, newEmail, otpHash],
    );

    await this._mailService.sendEmailChangeOtp(newEmail, otp);
  }

  async verifyUpdateEmailOtp(userId, payload) {
    const otp = payload.otp?.trim();

    if (!otp) {
      throw new Error('OTP_REQUIRED');
    }

    const otpResult = await this._pool.query(
      `SELECT id, new_email, otp_hash, expires_at, attempts
     FROM email_change_otps
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
      [userId],
    );

    if (!otpResult.rows.length) {
      throw new Error('OTP_NOT_FOUND');
    }

    const otpData = otpResult.rows[0];

    if (Number(otpData.attempts) >= 5) {
      throw new Error('OTP_TOO_MANY_ATTEMPTS');
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new Error('OTP_EXPIRED');
    }

    const inputOtpHash = hashOtp(otp);

    if (inputOtpHash !== otpData.otp_hash) {
      await this._pool.query(
        `UPDATE email_change_otps
       SET attempts = attempts + 1
       WHERE id = $1`,
        [otpData.id],
      );

      throw new Error('OTP_INVALID');
    }

    const userResult = await this._pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId],
    );

    if (!userResult.rows.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const oldEmail = userResult.rows[0].email;
    const newEmail = otpData.new_email;

    const duplicateResult = await this._pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      [newEmail, userId],
    );

    if (duplicateResult.rows.length) {
      throw new Error('EMAIL_DUPLICATE');
    }

    await this._pool.query('UPDATE users SET email = $2 WHERE id = $1', [
      userId,
      newEmail,
    ]);

    await this._pool.query('DELETE FROM email_change_otps WHERE user_id = $1', [
      userId,
    ]);

    await this._mailService.sendEmailChangedNotification(oldEmail, newEmail);

    return this.getUserById(userId);
  }

  async requestPasswordResetOtp(payload) {
    const email = payload.email?.trim().toLowerCase();

    if (!email) {
      throw new Error('EMAIL_REQUIRED');
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new Error('EMAIL_INVALID');
    }

    const userResult = await this._pool.query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email],
    );

    if (!userResult.rows.length || !userResult.rows[0].is_active) {
      return;
    }

    const user = userResult.rows[0];
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await this._pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [
      user.id,
    ]);

    await this._pool.query(
      `INSERT INTO password_reset_otps
      (user_id, otp_hash, expires_at)
     VALUES
      ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [user.id, otpHash],
    );

    await this._mailService.sendPasswordResetOtp(user.email, otp);
  }

  async resetPasswordWithOtp(payload) {
    const email = payload.email?.trim().toLowerCase();
    const otp = payload.otp?.trim();
    const newPassword = payload.newPassword || payload.new_password;
    const confirmPassword = payload.confirmPassword || payload.confirm_password;

    if (!email) {
      throw new Error('EMAIL_REQUIRED');
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new Error('EMAIL_INVALID');
    }

    if (!otp) {
      throw new Error('OTP_REQUIRED');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('NEW_PASSWORD_INVALID');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('PASSWORD_CONFIRM_MISMATCH');
    }

    const userResult = await this._pool.query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email],
    );

    if (!userResult.rows.length || !userResult.rows[0].is_active) {
      throw new Error('OTP_INVALID');
    }

    const user = userResult.rows[0];
    const otpResult = await this._pool.query(
      `SELECT id, otp_hash, expires_at, attempts
       FROM password_reset_otps
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id],
    );

    if (!otpResult.rows.length) {
      throw new Error('OTP_NOT_FOUND');
    }

    const otpData = otpResult.rows[0];

    if (Number(otpData.attempts) >= 5) {
      throw new Error('OTP_TOO_MANY_ATTEMPTS');
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new Error('OTP_EXPIRED');
    }

    if (hashOtp(otp) !== otpData.otp_hash) {
      await this._pool.query(
        `UPDATE password_reset_otps
         SET attempts = attempts + 1
         WHERE id = $1`,
        [otpData.id],
      );

      throw new Error('OTP_INVALID');
    }

    const hashedPassword = await hashBcrypt(newPassword, 10);

    await this._pool.query('UPDATE users SET password = $2 WHERE id = $1', [
      user.id,
      hashedPassword,
    ]);

    await this._pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [
      user.id,
    ]);

    await this._mailService.sendPasswordChangedNotification(user.email);
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
      await this._pool.query('UPDATE users SET email = $2 WHERE id = $1', [
        userId,
        newEmail,
      ]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('EMAIL_DUPLICATE');
      }

      throw error;
    }

    return this.getUserById(userId);
  }

  async verifyCurrentPassword(userId, payload) {
    const currentPassword = payload.currentPassword || payload.current_password;

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

    const validPassword = await verifyPassword(
      currentPassword,
      userResult.rows[0].password,
    );

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    return true;
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

    await this._pool.query('UPDATE users SET password = $2 WHERE id = $1', [
      userId,
      hashedPassword,
    ]);

    await this._mailService.sendPasswordChangedNotification(
      userResult.rows[0].email,
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
