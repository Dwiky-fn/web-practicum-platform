const pool = require('..');
const { displayTerm } = require('./utils');

const parseTahunSemester = (str) => {
  if (!str) return { year: '', term: '' };
  const parts = str.includes('-') ? str.split('-') : str.split(' ');
  const year = parts[0] || '';
  const term = (parts[1] || '').toUpperCase();
  return { year, term };
};

class DashboardService {
  constructor() {
    this._pool = pool;
  }

  async getDashboard() {
    const [
      users,
      courses,
      classes,
      activeSemester,
      classStudents,
      activities,
    ] = await Promise.all([
      this._pool.query(`
        SELECT role, COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active
        FROM users
        GROUP BY role
      `),
      this._pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE k.status = 'active')::int AS active
        FROM mata_kuliah mk
        JOIN kurikulum k ON k.id = mk.id_kurikulum
      `),
      this._pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'open')::int AS active
        FROM kelas_praktikum
      `),
      this._pool.query(`
        SELECT id, tahun_semester
        FROM tahun_semester
        WHERE status = 'active'
        LIMIT 1
      `),
      this._pool.query(`
        SELECT
          COUNT(DISTINCT id_mahasiswa)::int AS assigned,
          (SELECT COUNT(*)::int FROM users WHERE role = 'MAHASISWA') AS total
        FROM kelas_mhs
        WHERE status = 'active'
      `),
      this._pool.query(`
        SELECT created_at, title, message
        FROM activities
        ORDER BY created_at DESC
        LIMIT 5
      `).catch(() => ({ rows: [] })),
    ]);

    const roleMap = users.rows.reduce((acc, row) => {
      acc[row.role] = row;
      return acc;
    }, {});

    const semester = activeSemester.rows[0];
    let activeSem = null;
    if (semester) {
      const { year, term } = parseTahunSemester(semester.tahun_semester);
      activeSem = {
        id: semester.id,
        year,
        term: displayTerm(term),
      };
    }

    const assigned = classStudents.rows[0]?.assigned || 0;
    const totalStudents = classStudents.rows[0]?.total || 0;

    return {
      activeSemester: activeSem,
      stats: {
        students: roleMap.MAHASISWA || { total: 0, active: 0 },
        lecturers: roleMap.DOSEN || { total: 0, active: 0 },
        courses: courses.rows[0] || { total: 0, active: 0 },
        classes: classes.rows[0] || { total: 0, active: 0 },
        assignedStudents: assigned,
        unassignedStudents: Math.max(totalStudents - assigned, 0),
      },
      activities: activities.rows.map((row) => ({
        time: new Date(row.created_at).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        activity: row.message || row.title,
      })),
    };
  }
}

module.exports = DashboardService;
