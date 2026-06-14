const pool = require('..');
const {
  createId,
  displayStatus,
  displayTerm,
  mapClass,
  mapStudent,
  normalizeProgrammingLanguage,
  normalizeStatus,
} = require('./utils');

const replaceIdsInJson = (value, idMap) => {
  if (!value || !idMap.size) return value;
  if (typeof value === 'string') return idMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => replaceIdsInJson(item, idMap));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceIdsInJson(item, idMap)]),
    );
  }
  return value;
};

const normalizeAcademicTerm = (value) => {
  if (String(value).toUpperCase() === 'GANJIL' || String(value).toLowerCase() === 'ganjil') {
    return 'GANJIL';
  }
  if (String(value).toUpperCase() === 'GENAP' || String(value).toLowerCase() === 'genap') {
    return 'GENAP';
  }
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue)) return numberValue % 2 === 0 ? 'GENAP' : 'GANJIL';
  return null;
};

const resolveProgrammingLanguage = (value, fallback = 'java') => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).toLowerCase();
  if (!['java', 'python'].includes(normalized)) {
    throw new Error('PROGRAMMING_LANGUAGE_INVALID');
  }
  return normalized;
};

const createClientError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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
      SELECT cl.id, cl.name, cl.status, cl.programming_language,
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
    const programmingLanguage = resolveProgrammingLanguage(
      payload.programmingLanguage || payload.programming_language,
    );
    await this.ensureCourseAvailableForClass(courseId);
    await this.ensureClassUnique({
      courseId,
      name,
      academicPeriodId: activeSemester,
    });

    await this._pool.query(
      `INSERT INTO classes (
        id, course_id, name, lecturer_id, academic_period_id, status, programming_language
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        courseId,
        name,
        lecturerId,
        activeSemester,
        normalizeStatus(payload.status, 'AKTIF'),
        programmingLanguage,
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
    const programmingLanguage = resolveProgrammingLanguage(
      payload.programmingLanguage || payload.programming_language,
    );

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
       SET course_id = $1, name = $2, lecturer_id = $3, status = $4, programming_language = $5
       WHERE id = $6`,
      [nextCourseId, nextName, lecturerId, normalizedStatus, programmingLanguage, id],
    );

    return this.getClassDetail(id);
  }

  async deleteClass(id) {
    const found = await this._pool.query('SELECT id FROM classes WHERE id = $1', [id]);
    if (!found.rows.length) throw new Error('CLASS_NOT_FOUND');

    await this._pool.query('DELETE FROM classes WHERE id = $1', [id]);
  }

  async ensureClassUnique({ id, courseId, name, academicPeriodId }, client = this._pool) {
    const duplicate = await client.query(
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

  async ensureCourseAvailableForClass(courseId, client = this._pool, academicPeriodId = null) {
    const result = await client.query(
      `
      SELECT c.id, c.status, c.semester, ap.semester_type
      FROM courses c
      CROSS JOIN LATERAL (
        SELECT semester_type
        FROM academic_periods
        WHERE ($2::varchar IS NULL AND is_active = true)
          OR id = $2
        LIMIT 1
      ) ap
      WHERE c.id = $1
      `,
      [courseId, academicPeriodId],
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

  async getClassTemplates(filters = {}) {
    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword];
    let semesterClause = '';

    if (filters.semester) {
      const term = normalizeAcademicTerm(filters.semester);
      if (term) {
        params.push(term);
        semesterClause = `AND ap.semester_type = $${params.length}`;
      }
    }

    const result = await this._pool.query(
      `
      SELECT cl.id, cl.name, cl.programming_language,
        c.id AS course_id, c.name AS course_name, c.semester AS student_semester,
        u.id AS lecturer_id, u.fullname AS lecturer_name,
        ap.id AS academic_period_id, ap.year, ap.semester_type,
        tsp.study_program_id, tsp.study_program_name,
        COUNT(DISTINCT jc.id)::int AS jobsheet_count,
        COUNT(DISTINCT cs.student_id)::int AS student_count
      FROM classes cl
      JOIN courses c ON c.id = cl.course_id
      JOIN users u ON u.id = cl.lecturer_id
      JOIN academic_periods ap ON ap.id = cl.academic_period_id
      LEFT JOIN jobsheet_classes jc ON jc.class_id = cl.id
      LEFT JOIN class_students cs ON cs.class_id = cl.id AND cs.status = 'AKTIF'
      LEFT JOIN LATERAL (
        SELECT sp.study_program_id, sprog.name AS study_program_name
        FROM class_students lcs
        JOIN student_profiles sp ON sp.user_id = lcs.student_id
        LEFT JOIN study_programs sprog ON sprog.id = sp.study_program_id
        WHERE lcs.class_id = cl.id AND lcs.status = 'AKTIF'
        GROUP BY sp.study_program_id, sprog.name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) tsp ON true
      WHERE ($1 = '%%' OR LOWER(cl.name) LIKE $1 OR LOWER(c.name) LIKE $1 OR LOWER(u.fullname) LIKE $1)
        ${semesterClause}
      GROUP BY cl.id, c.id, u.id, ap.id, tsp.study_program_id, tsp.study_program_name
      ORDER BY ap.year DESC, ap.semester_type ASC, c.name ASC, cl.name ASC
      `,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      course_id: row.course_id,
      course_name: row.course_name,
      lecturer_id: row.lecturer_id,
      lecturer_name: row.lecturer_name,
      programming_language: normalizeProgrammingLanguage(row.programming_language),
      programming_language_display_name: normalizeProgrammingLanguage(row.programming_language) === 'python'
        ? 'Python'
        : 'Java',
      study_program_id: row.study_program_id,
      study_program_name: row.study_program_name,
      semester: row.student_semester,
      academic_term: displayTerm(row.semester_type),
      academic_term_value: row.semester_type,
      academic_period_id: row.academic_period_id,
      academic_year: `${row.year} - ${displayTerm(row.semester_type)}`,
      jobsheet_count: row.jobsheet_count,
      student_count: row.student_count,
    }));
  }

  async getClassClonePreview(classId) {
    const source = await this._pool.query(
      `
      SELECT cl.id, cl.name, cl.programming_language,
        c.name AS course_name, u.fullname AS lecturer_name,
        c.semester, ap.year, ap.semester_type,
        COUNT(DISTINCT jc.id)::int AS jobsheet_count
      FROM classes cl
      JOIN courses c ON c.id = cl.course_id
      JOIN users u ON u.id = cl.lecturer_id
      JOIN academic_periods ap ON ap.id = cl.academic_period_id
      LEFT JOIN jobsheet_classes jc ON jc.class_id = cl.id
      WHERE cl.id = $1
      GROUP BY cl.id, c.id, u.id, ap.id
      `,
      [classId],
    );

    if (!source.rows.length) throw new Error('CLONE_SOURCE_CLASS_NOT_FOUND');

    const row = source.rows[0];
    return {
      source_class: {
        id: row.id,
        name: row.name,
        course_name: row.course_name,
        lecturer_name: row.lecturer_name,
        programming_language: normalizeProgrammingLanguage(row.programming_language),
        programming_language_display_name: normalizeProgrammingLanguage(row.programming_language) === 'python'
          ? 'Python'
          : 'Java',
        semester: row.semester,
        academic_term: displayTerm(row.semester_type),
        academic_term_value: row.semester_type,
        academic_year: `${row.year} - ${displayTerm(row.semester_type)}`,
      },
      copyable_data: {
        course: true,
        lecturer: true,
        jobsheets: row.jobsheet_count,
        settings: true,
      },
      excluded_data: [
        'students',
        'submissions',
        'grades',
        'lecturer_feedback',
        'ai_feedback',
        'ai_validation',
        'student_progress',
        'execution_history',
        'compile_result',
        'run_result',
      ],
    };
  }

  async _resolveAcademicPeriod(client, payload) {
    const academicPeriodId = payload.academicPeriodId || payload.academic_period_id;
    if (academicPeriodId) {
      const result = await client.query('SELECT id, year, semester_type FROM academic_periods WHERE id = $1 LIMIT 1', [
        academicPeriodId,
      ]);
      if (!result.rows.length) throw new Error('CLONE_ACADEMIC_PERIOD_NOT_FOUND');
      return result.rows[0];
    }

    if (payload.academic_year && payload.semester) {
      const term = normalizeAcademicTerm(payload.semester);
      const result = await client.query(
        'SELECT id, year, semester_type FROM academic_periods WHERE year = $1 AND semester_type = $2 LIMIT 1',
        [payload.academic_year, term],
      );
      if (!result.rows.length) throw new Error('CLONE_ACADEMIC_PERIOD_NOT_FOUND');
      return result.rows[0];
    }

    const active = await client.query('SELECT id, year, semester_type FROM academic_periods WHERE is_active = true LIMIT 1');
    if (!active.rows.length) throw new Error('ACTIVE_SEMESTER_NOT_FOUND');
    return active.rows[0];
  }

  async _cloneJobsheetsToClass(client, sourceClassId, targetClassId) {
    const sourceJobsheets = await client.query(
      `
      SELECT jc.*, j.course_id, j.status AS jobsheet_status
      FROM jobsheet_classes jc
      JOIN jobsheets j ON j.id = jc.jobsheet_id
      WHERE jc.class_id = $1
      ORDER BY jc.deadline ASC NULLS LAST, jc.title ASC
      `,
      [sourceClassId],
    );

    for (const jobsheetClass of sourceJobsheets.rows) {
      const newJobsheetId = createId('job');
      const idMap = new Map();

      const experiments = await client.query(
        'SELECT * FROM experiments WHERE jobsheet_id = $1 ORDER BY id ASC',
        [jobsheetClass.jobsheet_id],
      );
      const exercises = await client.query(
        'SELECT * FROM exercises WHERE jobsheet_id = $1 ORDER BY id ASC',
        [jobsheetClass.jobsheet_id],
      );

      const clonedExperiments = experiments.rows.map((experiment) => {
        const id = createId('exp');
        idMap.set(experiment.id, id);
        return { ...experiment, id };
      });
      const clonedExercises = exercises.rows.map((exercise) => {
        const id = createId('exe');
        idMap.set(exercise.id, id);
        return { ...exercise, id };
      });

      const clonedContent = replaceIdsInJson(jobsheetClass.content || {}, idMap);
      await client.query(
        `
        INSERT INTO jobsheets (id, course_id, title, description, goal, content, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          newJobsheetId,
          jobsheetClass.course_id,
          jobsheetClass.title,
          jobsheetClass.description || '',
          jobsheetClass.goal || '',
          JSON.stringify(clonedContent),
          jobsheetClass.jobsheet_status || 'DRAFT',
        ],
      );

      for (const experiment of clonedExperiments) {
        await client.query(
          `
          INSERT INTO experiments (id, jobsheet_id, title, instruction_content, template_code, rubric)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            experiment.id,
            newJobsheetId,
            experiment.title,
            JSON.stringify(experiment.instruction_content || {}),
            experiment.template_code || '',
            experiment.rubric || 0,
          ],
        );
      }

      for (const exercise of clonedExercises) {
        await client.query(
          `
          INSERT INTO exercises (id, jobsheet_id, title, instruction_content, template_code, rubric)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            exercise.id,
            newJobsheetId,
            exercise.title,
            JSON.stringify(exercise.instruction_content || {}),
            exercise.template_code || '',
            exercise.rubric || 0,
          ],
        );
      }

      const newJobsheetClassId = createId('jkc');
      await client.query(
        `
        INSERT INTO jobsheet_classes (
          id, jobsheet_id, class_id, is_active, deadline,
          title, description, goal, content, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          newJobsheetClassId,
          newJobsheetId,
          targetClassId,
          jobsheetClass.is_active,
          jobsheetClass.deadline,
          jobsheetClass.title,
          jobsheetClass.description || '',
          jobsheetClass.goal || '',
          JSON.stringify(clonedContent),
          jobsheetClass.status,
        ],
      );

      const classExperiments = await client.query(
        'SELECT * FROM class_experiments WHERE jobsheet_class_id = $1 ORDER BY id ASC',
        [jobsheetClass.id],
      );
      for (const experiment of classExperiments.rows) {
        await client.query(
          `
          INSERT INTO class_experiments (
            id, jobsheet_class_id, experiment_id, title, instruction_content, template_code
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            createId('cex'),
            newJobsheetClassId,
            idMap.get(experiment.experiment_id) || null,
            experiment.title,
            JSON.stringify(replaceIdsInJson(experiment.instruction_content || {}, idMap)),
            experiment.template_code || '',
          ],
        );
      }

      const classExercises = await client.query(
        'SELECT * FROM class_exercises WHERE jobsheet_class_id = $1 ORDER BY id ASC',
        [jobsheetClass.id],
      );
      for (const exercise of classExercises.rows) {
        await client.query(
          `
          INSERT INTO class_exercises (
            id, jobsheet_class_id, exercise_id, title, instruction_content, template_code
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            createId('cex'),
            newJobsheetClassId,
            idMap.get(exercise.exercise_id) || null,
            exercise.title,
            JSON.stringify(replaceIdsInJson(exercise.instruction_content || {}, idMap)),
            exercise.template_code || '',
          ],
        );
      }
    }

    return sourceJobsheets.rows.length;
  }

  async _autoEnrollStudents(client, classId, payload, courseId, courseSemester) {
    if (!payload.study_program_id) throw new Error('CLONE_STUDY_PROGRAM_REQUIRED');
    if (!payload.generation) throw new Error('CLONE_GENERATION_REQUIRED');

    const students = await client.query(
      `
      SELECT u.id
      FROM users u
      JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'MAHASISWA'
        AND u.is_active = true
        AND sp.study_program_id = $1
        AND sp.angkatan = $2
        AND sp.semester = $3
        AND NOT EXISTS (
          SELECT 1
          FROM class_students cs
          JOIN classes cl ON cl.id = cs.class_id
          WHERE cs.student_id = u.id
            AND cs.status = 'AKTIF'
            AND cl.course_id = $4
        )
      ORDER BY sp.nim ASC
      `,
      [payload.study_program_id, Number(payload.generation), Number(courseSemester), courseId],
    );

    for (const student of students.rows) {
      await client.query(
        `
        INSERT INTO class_students (id, class_id, student_id, status)
        VALUES ($1, $2, $3, 'AKTIF')
        ON CONFLICT (class_id, student_id)
        DO UPDATE SET status = 'AKTIF'
        `,
        [createId('cs'), classId, student.id],
      );
    }

    return students.rows.length;
  }

  async cloneClass(payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const sourceResult = await client.query(
        `
        SELECT cl.*, c.semester AS course_semester, ap.semester_type AS source_semester_type
        FROM classes cl
        JOIN courses c ON c.id = cl.course_id
        JOIN academic_periods ap ON ap.id = cl.academic_period_id
        WHERE cl.id = $1
        LIMIT 1
        `,
        [payload.source_class_id],
      );
      if (!sourceResult.rows.length) throw new Error('CLONE_SOURCE_CLASS_NOT_FOUND');

      const sourceClass = sourceResult.rows[0];
      const targetAcademicPeriod = await this._resolveAcademicPeriod(client, payload);
      const academicPeriodId = targetAcademicPeriod.id;
      const newClassId = createId('kelas');
      const lecturerId = payload.lecturer_id || sourceClass.lecturer_id;
      const programmingLanguage = resolveProgrammingLanguage(
        payload.programming_language || sourceClass.programming_language,
      );
      const sourceTerm = sourceClass.source_semester_type;
      const targetTerm = targetAcademicPeriod.semester_type;

      if (targetTerm !== sourceTerm) {
        throw createClientError(
          `Kelas semester ${displayTerm(sourceTerm)} tidak dapat digunakan sebagai template untuk semester ${displayTerm(targetTerm)}`,
        );
      }

      const requestedTerm = payload.semester ? normalizeAcademicTerm(payload.semester) : sourceTerm;
      if (requestedTerm && requestedTerm !== sourceTerm) {
        throw createClientError(
          `Kelas semester ${displayTerm(sourceTerm)} tidak dapat digunakan sebagai template untuk semester ${displayTerm(requestedTerm)}`,
        );
      }

      if (
        payload.copy_jobsheets &&
        programmingLanguage !== normalizeProgrammingLanguage(sourceClass.programming_language)
      ) {
        throw createClientError(
          'Bahasa pemrograman harus sama dengan kelas sumber jika jobsheet ikut disalin',
        );
      }

      await this.ensureCourseAvailableForClass(sourceClass.course_id, client, academicPeriodId);
      await this.ensureClassUnique({
        courseId: sourceClass.course_id,
        name: payload.name,
        academicPeriodId,
      }, client);

      await client.query(
        `
        INSERT INTO classes (
          id, course_id, name, lecturer_id, academic_period_id, status, programming_language
        )
        VALUES ($1, $2, $3, $4, $5, 'AKTIF', $6)
        `,
        [newClassId, sourceClass.course_id, payload.name, lecturerId, academicPeriodId, programmingLanguage],
      );

      const jobsheetsCopied = payload.copy_jobsheets
        ? await this._cloneJobsheetsToClass(client, sourceClass.id, newClassId)
        : 0;
      const studentsAdded = payload.auto_enroll_students
        ? await this._autoEnrollStudents(
          client,
          newClassId,
          payload,
          sourceClass.course_id,
          sourceClass.course_semester,
        )
        : 0;

      await client.query('COMMIT');

      return {
        class_id: newClassId,
        students_added: studentsAdded,
        jobsheets_copied: jobsheetsCopied,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
      `SELECT cl.course_id, cl.academic_period_id, c.semester
     FROM classes cl
     JOIN courses c ON c.id = cl.course_id
     WHERE cl.id = $1`,
      [classId],
    );

    if (!classInfo.rows.length) throw new Error('CLASS_NOT_FOUND');

    const {
      course_id: courseId,
      semester: courseSemester,
    } = classInfo.rows[0];

    const keyword = `%${(filters.keyword || '').toLowerCase()}%`;
    const params = [keyword, courseId, Number(courseSemester)];
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
          WHERE cs.student_id = u.id AND cs.status = 'AKTIF' AND cl.course_id = $2
        )
        AND sp.semester = $3
        AND ($1 = '%%' OR LOWER(u.fullname) LIKE $1 OR LOWER(COALESCE(sp.nim, '')) LIKE $1)
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
      DELETE FROM class_students
      WHERE class_id = $1 AND student_id = $2
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
