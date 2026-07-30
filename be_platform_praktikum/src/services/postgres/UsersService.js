const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('.');
const GoogleService = require('../auth/GoogleService');
const MailService = require('../mail/MailService');
const TokenService = require('../auth/TokenService');
const { NotFoundError } = require('../../exceptions');

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

    await this._pool.query(
      `UPDATE users
       SET avatar_url = COALESCE(avatar_url, $2)
       WHERE id = $1`,
      [userId, avatarUrl],
    );
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
    const email = payload.email?.trim();

    if (!email) {
      throw new Error('EMAIL_FORGOT_REQUIRED');
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
      throw new Error('USER_EMAIL_NOT_FOUND');
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

    await this._mailService.sendPasswordResetOtp({
      to: user.email,
      otp,
    });
  }

  async verifyPasswordResetOtp(payload) {
    const email = payload.email?.trim();
    const otp = payload.otp?.trim();

    if (!email) {
      throw new Error('EMAIL_FORGOT_REQUIRED');
    }

    if (!otp) {
      throw new Error('OTP_REQUIRED');
    }

    const userResult = await this._pool.query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email],
    );

    if (!userResult.rows.length || !userResult.rows[0].is_active) {
      throw new Error('USER_EMAIL_NOT_FOUND');
    }

    const user = userResult.rows[0];

    const otpResult = await this._pool.query(
      `SELECT id, otp_hash, expires_at, attempts, is_verified
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

    if (otpData.is_verified) {
      throw new Error('OTP_INVALID');
    }

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

    const resetToken = crypto.randomBytes(32).toString('hex');

    await this._pool.query(
      `UPDATE password_reset_otps
       SET is_verified = true, reset_token = $2
       WHERE id = $1`,
      [otpData.id, resetToken]
    );

    return { resetToken };
  }

  async resetForgottenPassword(payload) {
    const { resetToken } = payload;
    const newPassword = payload.newPassword || payload.new_password;
    const confirmPassword = payload.confirmPassword || payload.confirm_password;

    if (!resetToken) {
      throw new Error('RESET_TOKEN_REQUIRED');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('NEW_PASSWORD_INVALID');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('PASSWORD_CONFIRM_MISMATCH');
    }

    const otpResult = await this._pool.query(
      `SELECT o.id, o.user_id, o.expires_at, u.email
       FROM password_reset_otps o
       JOIN users u ON u.id = o.user_id
       WHERE o.reset_token = $1 AND o.is_verified = true
       LIMIT 1`,
      [resetToken]
    );

    if (!otpResult.rows.length) {
      throw new Error('RESET_TOKEN_INVALID');
    }

    const otpData = otpResult.rows[0];

    if (new Date(otpData.expires_at) < new Date()) {
      throw new Error('RESET_TOKEN_EXPIRED');
    }

    const hashedPassword = await hashBcrypt(newPassword, 10);

    await this._pool.query('UPDATE users SET password = $2 WHERE id = $1', [
      otpData.user_id,
      hashedPassword,
    ]);

    await this._pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [
      otpData.user_id,
    ]);

    await this._mailService.sendPasswordChangedNotification(otpData.email);
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
        COALESCE(prog.name, sp.program_studi) AS program_studi,
        COALESCE(dept.name, sp.jurusan) AS jurusan,
        sp.study_program_id,
        sp.angkatan,
        sp.semester,
        sp.status,
        sp.status AS student_status,
        (
          SELECT k.kelas
          FROM kelas_mhs km
          JOIN kelas_semester ks ON ks.id = km.id_kelas_semester
          JOIN kelas k ON k.id = ks.id_kelas
          JOIN tahun_semester ts ON ts.id = ks.id_tahun_semester
          WHERE km.id_mahasiswa = u.id AND km.status = 'active' AND ts.status = 'active'
          LIMIT 1
        ) AS kelas,
        u.avatar_url,
        sp.no_telepon,
        sp.tempat_lahir,
        TO_CHAR(sp.tanggal_lahir, 'YYYY-MM-DD') AS tanggal_lahir,
        sp.kota,
        -- Lecturer Profile
        lp.nip,
        lp.no_telepon AS lp_no_telepon,
        lp.tempat_lahir AS lp_tempat_lahir,
        TO_CHAR(lp.tanggal_lahir, 'YYYY-MM-DD') AS lp_tanggal_lahir,
        lp.kota AS lp_kota,
        -- Admin Profile
        ap.nip AS ap_nip,
        ap.no_telepon AS ap_no_telepon,
        ap.tempat_lahir AS ap_tempat_lahir,
        TO_CHAR(ap.tanggal_lahir, 'YYYY-MM-DD') AS ap_tanggal_lahir,
        ap.kota AS ap_kota,
        COALESCE(ap.program_studi, 'D3 Teknik Informatika') AS ap_program_studi,
        COALESCE(ap.jurusan, 'Teknik Elektro') AS ap_jurusan
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN study_programs prog ON prog.id = sp.study_program_id
      LEFT JOIN departments dept ON dept.id = prog.department_id
      LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.id = $1`,
      [userId],
    );

    if (!result.rows.length) {
      throw new NotFoundError('User tidak ditemukan');
    }

    const row = result.rows[0];

    // Normalize: ambil avatar & personal data dari profil yang sesuai role
    if (row.role === 'DOSEN') {
      row.no_telepon = row.lp_no_telepon;
      row.tempat_lahir = row.lp_tempat_lahir;
      row.tanggal_lahir = row.lp_tanggal_lahir;
      row.kota = row.lp_kota;
    } else if (row.role === 'ADMIN') {
      row.nip = row.ap_nip || row.nip || null;
      row.no_telepon = row.ap_no_telepon;
      row.tempat_lahir = row.ap_tempat_lahir;
      row.tanggal_lahir = row.ap_tanggal_lahir;
      row.kota = row.ap_kota;
      row.program_studi = row.ap_program_studi;
      row.jurusan = row.ap_jurusan;
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
        throw new NotFoundError('User tidak ditemukan');
      }

      const role = currentResult.rows[0].role;
      const personalData = payload.personalData || payload.personal_data || {};

      await client.query(
        `UPDATE users
         SET
          is_active = COALESCE($2, is_active),
          avatar_url = COALESCE($3, avatar_url)
         WHERE id = $1`,
        [
          userId,
          typeof payload.isActive === 'boolean' ? payload.isActive : null,
          payload.avatarUrl ?? payload.avatar_url ?? null,
        ],
      );

      if (role === 'MAHASISWA') {
        await client.query(
          `UPDATE student_profiles
           SET
            no_telepon = COALESCE($2, no_telepon),
            tempat_lahir = COALESCE($3, tempat_lahir),
            tanggal_lahir = COALESCE($4, tanggal_lahir),
            kota = COALESCE($5, kota)
           WHERE user_id = $1`,
          [
            userId,
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
            no_telepon = COALESCE($2, no_telepon),
            tempat_lahir = COALESCE($3, tempat_lahir),
            tanggal_lahir = COALESCE($4, tanggal_lahir),
            kota = COALESCE($5, kota)
           WHERE user_id = $1`,
          [
            userId,
            personalData.no_telepon ?? null,
            personalData.tempat_lahir ?? null,
            personalData.tanggal_lahir || null,
            personalData.kota ?? null,
          ],
        );
      }

      if (role === 'ADMIN') {
        await client.query(
          `INSERT INTO admin_profiles (user_id, no_telepon, tempat_lahir, tanggal_lahir, kota)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET
            no_telepon = COALESCE(EXCLUDED.no_telepon, admin_profiles.no_telepon),
            tempat_lahir = COALESCE(EXCLUDED.tempat_lahir, admin_profiles.tempat_lahir),
            tanggal_lahir = COALESCE(EXCLUDED.tanggal_lahir, admin_profiles.tanggal_lahir),
            kota = COALESCE(EXCLUDED.kota, admin_profiles.kota),
            updated_at = CURRENT_TIMESTAMP`,
          [
            userId,
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

    const validPassword = await verifyPassword(currentPassword, user.password);

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    try {
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

    const validPassword = await verifyPassword(
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

    return this.getUserById(userId);
  }

  async changeAuthenticatedUserPassword(userId, payload) {
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

    const user = userResult.rows[0];

    const validPassword = await verifyPassword(
      currentPassword,
      user.password,
    );

    if (!validPassword) {
      throw new Error('PASSWORD_INVALID');
    }

    const isSamePassword = await verifyPassword(
      newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new Error('PASSWORD_SAME_AS_OLD');
    }

    const hashedPassword = await hashBcrypt(newPassword, 10);

    await this._pool.query(
      `UPDATE users
       SET password = $2
       WHERE id = $1`,
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
      throw new NotFoundError('User tidak ditemukan');
    }

    const role = currentResult.rows[0].role;

    await this._pool.query(
      `UPDATE users
       SET avatar_url = $2
       WHERE id = $1`,
      [userId, avatarUrl],
    );

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
