const pool = require('.');

class UsersService {
  constructor() {
    this._pool = pool;
  }

  async getUserById(userId) {
    const result = await this._pool.query(
      `SELECT
        id,
        full_name,
        email,
        role,
        is_active,
        created_at
      FROM users
      WHERE id = $1`,
      [userId],
    );

    if (!result.rows.length) {
      throw new Error('User tidak ditemukan');
    }

    return result.rows[0];
  }
}

module.exports = UsersService;