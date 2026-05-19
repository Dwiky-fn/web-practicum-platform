const pool = require('.');

class UsersService {
  constructor() {
    this._pool = pool;
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
      throw new Error('User tidak ditemukan');
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
}

module.exports = UsersService;
