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
    let courseClause = '';
    let lecturerClause = '';

    if (filters.status && filters.status !== 'all') {
      params.push(normalizeStatus(filters.status));
      statusClause = `AND cl.status = $${params.length}`;
    }

    if (filters.courseId && filters.courseId !== 'all') {
      params.push(filters.courseId);
      courseClause = `AND cl.course_id = $${params.length}`;
    }

    if (filters.lecturerId) {
      params.push(filters.lecturerId);
      lecturerClause = `AND cl.lecturer_id = $${params.length}`;
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
        ${courseClause}
        ${lecturerClause}
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

    const courseId = payload.courseId || payload.course_id;
    const name = payload.name;
    const lecturerId = payload.lecturerId || payload.lecturer_id;
    await this.ensureCourseAvailableForClass(courseId);
    await this.ensureClassUnique({
      courseId,
      name,
      academicPeriodId: activeSemester,
    });

    await this._pool.query(
      `INSERT INTO classes (id, course_id, name, lecturer_id, academic_period_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        courseId,
        name,
        lecturerId,
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

  async updateClass(id, payload) {
    const lecturerId = payload.lecturerId || payload.lecturer_id;
    const status = payload.status;
    const courseId = payload.courseId || payload.course_id;
    const name = payload.name;

    const existing = await this._pool.query(
      'SELECT id, course_id, name, academic_period_id FROM classes WHERE id = $1',
      [id],
    );
    if (!existing.rows.length) throw new Error('CLASS_NOT_FOUND');
    if (!lecturerId) throw new Error('LECTURER_REQUIRED');
    if (!status) throw new Error('STATUS_REQUIRED');

    const normalizedStatus = normalizeStatus(status);
    if (!['AKTIF', 'NONAKTIF', 'ARSIP'].includes(normalizedStatus)) {
      throw new Error('CLASS_STATUS_INVALID');
    }

    const nextCourseId = courseId || existing.rows[0].course_id;
    const nextName = name || existing.rows[0].name;
    await this.ensureCourseAvailableForClass(nextCourseId);
    await this.ensureClassUnique({
      id,
      courseId: nextCourseId,
      name: nextName,
      academicPeriodId: existing.rows[0].academic_period_id,
    });

    await this._pool.query(
      `UPDATE classes
       SET course_id = $1, name = $2, lecturer_id = $3, status = $4
       WHERE id = $5`,
      [nextCourseId, nextName, lecturerId, normalizedStatus, id],
    );

    return this.getClassDetail(id);
  }

  async deleteClass(id) {
    const found = await this._pool.query('SELECT id FROM classes WHERE id = $1', [id]);
    if (!found.rows.length) throw new Error('CLASS_NOT_FOUND');

    await this._pool.query('DELETE FROM classes WHERE id = $1', [id]);
  }

  async ensureClassUnique({ id, courseId, name, academicPeriodId }) {
    const duplicate = await this._pool.query(
      `SELECT id FROM classes
       WHERE id <> COALESCE($1, '')
        AND course_id = $2
        AND LOWER(name) = LOWER($3)
        AND academic_period_id = $4
       LIMIT 1`,
      [id || '', courseId, name, academicPeriodId],
    );

    if (duplicate.rows.length) throw new Error('CLASS_DUPLICATE');
  }

  async ensureCourseAvailableForClass(courseId) {
    const result = await this._pool.query(
      `
      SELECT c.id, c.status, c.semester, ap.semester_type
      FROM courses c
      CROSS JOIN LATERAL (
        SELECT semester_type
        FROM academic_periods
        WHERE is_active = true
        LIMIT 1
      ) ap
      WHERE c.id = $1
      `,
      [courseId],
    );

    if (!result.rows.length) throw new Error('COURSE_NOT_FOUND');

    const course = result.rows[0];
    const activeStudentSemesters = course.semester_type === 'GANJIL'
      ? [1, 3, 5]
      : [2, 4, 6];

    if (course.status !== 'AKTIF' || !activeStudentSemesters.includes(Number(course.semester))) {
      throw new Error('COURSE_INACTIVE');
    }
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
    const classInfo = await this._pool.query(
      `SELECT cl.course_id, c.semester
       FROM classes cl
       JOIN courses c ON c.id = cl.course_id
       WHERE cl.id = $1`,
      [classId],
    );
    if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');
    const { course_id: courseId, semester: courseSemester } = classInfo.rows[0];

    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [classId, keyword, courseId, Number(courseSemester)];
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
          JOIN classes cl ON cs.class_id = cl.id
          WHERE cs.student_id = u.id AND cs.status = 'AKTIF' AND cl.course_id = $3
        )
        AND sp.semester = $4
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

      const classInfo = await client.query(
        `SELECT cl.course_id, c.semester
         FROM classes cl
         JOIN courses c ON c.id = cl.course_id
         WHERE cl.id = $1`,
        [classId],
      );
      if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');
      const { course_id: courseId, semester: courseSemester } = classInfo.rows[0];

      for (const studentId of studentIds) {
        const studentProfile = await client.query(
          `SELECT semester, nim FROM student_profiles WHERE user_id = $1`,
          [studentId],
        );
        if (!studentProfile.rows.length) {
          throw new Error('USER_NOT_FOUND');
        }
        const studentSemester = studentProfile.rows[0].semester;
        if (Number(studentSemester) !== Number(courseSemester)) {
          throw new Error('STUDENT_SEMESTER_MISMATCH');
        }

        const existingClass = await client.query(
          `SELECT cl.name AS class_name
           FROM class_students cs
           JOIN classes cl ON cs.class_id = cl.id
           WHERE cs.student_id = $1 AND cs.status = 'AKTIF' AND cl.course_id = $2
             AND cl.id <> $3
           LIMIT 1`,
          [studentId, courseId, classId],
        );
        if (existingClass.rows.length) {
          throw new Error('STUDENT_ALREADY_IN_COURSE_CLASS');
        }
      }

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

  async removeStudentFromClass(classId, studentId) {
    const result = await this._pool.query(
      `
      UPDATE class_students
      SET status = 'NONAKTIF'
      WHERE class_id = $1 AND student_id = $2 AND status = 'AKTIF'
      RETURNING id
      `,
      [classId, studentId],
    );

    if (!result.rows.length) {
      throw new Error('STUDENT_NOT_FOUND_IN_CLASS');
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
