const pool = require('.');

class UsersService {
  constructor() {
    this._pool = pool;
  }

  async getUserById(userId) {
    const result = await this._pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        sp.nim,
        sp.status AS student_status
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1`,
      [userId],
    );

    if (!result.rows.length) {
      throw new Error('User tidak ditemukan');
    }

    return result.rows[0];
  }
}

module.exports = UsersService;