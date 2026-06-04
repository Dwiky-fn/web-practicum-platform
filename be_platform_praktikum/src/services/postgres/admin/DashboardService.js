const pool = require('..');
const { displayTerm } = require('./utils');

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
          COUNT(*) FILTER (WHERE status = 'AKTIF')::int AS active
        FROM courses
      `),
      this._pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'AKTIF')::int AS active
        FROM classes
      `),
      this._pool.query(`
        SELECT id, year, semester_type
        FROM academic_periods
        WHERE is_active = true
        LIMIT 1
      `),
      this._pool.query(`
        SELECT
          COUNT(DISTINCT student_id)::int AS assigned,
          (SELECT COUNT(*)::int FROM users WHERE role = 'MAHASISWA') AS total
        FROM class_students
        WHERE status = 'AKTIF'
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
    const assigned = classStudents.rows[0]?.assigned || 0;
    const totalStudents = classStudents.rows[0]?.total || 0;

    return {
      activeSemester: semester ? {
        id: semester.id,
        year: semester.year,
        term: displayTerm(semester.semester_type),
      } : null,
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
