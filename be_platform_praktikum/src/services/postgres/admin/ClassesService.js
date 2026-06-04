const pool = require('..');
const {
  createId,
  displayStatus,
  mapClass,
  mapStudent,
  normalizeStatus,
} = require('./utils');

class ClassesService {
  constructor() {
    this._pool = pool;
  }

  async getClasses(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let statusClause = '';

    if (filters.status && filters.status !== 'all') {
      params.push(normalizeStatus(filters.status));
      statusClause = `AND cl.status = $${params.length}`;
    }

    const result = await this._pool.query(
      `
      SELECT cl.id, cl.name, cl.status,
        c.id AS course_id, c.name AS course_name, c.semester AS student_semester,
        u.id AS lecturer_id, u.fullname AS lecturer,
        ap.id AS academic_period_id, ap.year, ap.semester_type
      FROM classes cl
      JOIN courses c ON c.id = cl.course_id
      JOIN users u ON u.id = cl.lecturer_id
      JOIN academic_periods ap ON ap.id = cl.academic_period_id
      WHERE ($1 = '%%' OR LOWER(cl.name) LIKE $1 OR LOWER(c.name) LIKE $1 OR LOWER(u.fullname) LIKE $1)
        AND ap.is_active = true
        ${statusClause}
      ORDER BY ap.is_active DESC, c.name ASC, cl.name ASC
      `,
      params,
    );

    return result.rows.map(mapClass);
  }

  async createClass(payload) {
    const id = payload.id || createId('kelas');
    const activeSemester = payload.academicPeriodId || payload.academic_period_id ||
      (await this._pool.query('SELECT id FROM academic_periods WHERE is_active = true LIMIT 1')).rows[0]?.id;

    if (!activeSemester) throw new Error('ACTIVE_SEMESTER_NOT_FOUND');

    await this._pool.query(
      `INSERT INTO classes (id, course_id, name, lecturer_id, academic_period_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        payload.courseId || payload.course_id,
        payload.name,
        payload.lecturerId || payload.lecturer_id,
        activeSemester,
        normalizeStatus(payload.status, 'AKTIF'),
      ],
    );

    return (await this.getClasses()).find((item) => item.id === id);
  }

  async getClassDetail(id) {
    const classItem = (await this.getClasses()).find((item) => item.id === id);
    if (!classItem) throw new Error('CLASS_NOT_FOUND');

    const [students, jobsheets] = await Promise.all([
      this.getClassStudents(id),
      this.getClassJobsheets(id),
    ]);

    return {
      ...classItem,
      students,
      jobsheets,
    };
  }

  async getClassStudents(classId) {
    const result = await this._pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.is_active,
        sp.nim, sp.program_studi, sp.jurusan, sp.angkatan, sp.semester,
        sp.status, sp.avatar_url
      FROM class_students cs
      JOIN users u ON u.id = cs.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE cs.class_id = $1 AND cs.status = 'AKTIF'
      ORDER BY sp.nim ASC
      `,
      [classId],
    );

    return result.rows.map(mapStudent);
  }

  async getStudentCandidates(classId, filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [classId, keyword];
    let semesterClause = '';

    if (filters.semester && filters.semester !== 'all') {
      params.push(Number(filters.semester));
      semesterClause = `AND sp.semester = $${params.length}`;
    }

    const result = await this._pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.is_active,
        sp.nim, sp.program_studi, sp.jurusan, sp.angkatan, sp.semester,
        sp.status, sp.avatar_url
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'MAHASISWA'
        AND NOT EXISTS (
          SELECT 1 FROM class_students cs
          WHERE cs.class_id = $1 AND cs.student_id = u.id AND cs.status = 'AKTIF'
        )
        AND ($2 = '%%' OR LOWER(u.fullname) LIKE $2 OR LOWER(COALESCE(sp.nim, '')) LIKE $2)
        ${semesterClause}
      ORDER BY sp.nim ASC
      `,
      params,
    );

    return result.rows.map(mapStudent);
  }

  async assignStudentsToClass(classId, studentIds) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      for (const studentId of studentIds) {
        await client.query(
          `
          INSERT INTO class_students (id, class_id, student_id, status)
          VALUES ($1, $2, $3, 'AKTIF')
          ON CONFLICT (class_id, student_id)
          DO UPDATE SET status = 'AKTIF'
          `,
          [createId('cs'), classId, studentId],
        );
      }
      await client.query('COMMIT');
      return this.getClassStudents(classId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClassJobsheets(classId) {
    const result = await this._pool.query(
      `
      SELECT jc.id, jc.jobsheet_id, jc.title, jc.deadline, jc.status
      FROM jobsheet_classes jc
      WHERE jc.class_id = $1
      ORDER BY jc.deadline ASC NULLS LAST, jc.title ASC
      `,
      [classId],
    );

    return result.rows.map((row) => ({
      id: row.jobsheet_id,
      classJobsheetId: row.id,
      title: row.title,
      deadline: row.deadline ? new Date(row.deadline).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : '-',
      status: displayStatus(row.status),
    }));
  }
}

module.exports = ClassesService;
