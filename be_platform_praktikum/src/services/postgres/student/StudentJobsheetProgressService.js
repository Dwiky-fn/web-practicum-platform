const pool = require('..');
const { randomUUID } = require('crypto');

class StudentJobsheetProgressService {
  constructor() {
    this._pool = pool;
  }

  async _resolveAcademicContext(studentId, jobsheetId, classId, kelasPraktikumId) {
    if (kelasPraktikumId) {
      const nativeResult = await this._pool.query(
        `SELECT kp.legacy_class_id AS class_id,
          kp.id AS id_kelas_praktikum,
          km.id AS id_kelas_mhs
         FROM kelas_praktikum kp
         JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
          AND km.id_mahasiswa = $1
         WHERE kp.id = $2
           AND jc.jobsheet_id = $3
         LIMIT 1`,
        [studentId, kelasPraktikumId, jobsheetId],
      );

      if (nativeResult.rows.length) return nativeResult.rows[0];
    }

    const params = [studentId, jobsheetId];
    let filter = '';

    if (kelasPraktikumId) {
      params.push(kelasPraktikumId);
      filter = `AND kp.id = $${params.length}`;
    } else if (classId) {
      params.push(classId);
      filter = `AND cl.id = $${params.length}`;
    }

    const result = await this._pool.query(
      `SELECT cl.id AS class_id,
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM classes cl
       JOIN class_students cs ON cs.class_id = cl.id
       JOIN jobsheets j ON j.course_id = cl.course_id
       LEFT JOIN kelas_praktikum kp ON kp.legacy_class_id = cl.id
       LEFT JOIN kelas_mhs km
         ON km.id_tahun_semester = kp.id_tahun_semester
        AND km.id_semester = kp.id_semester
        AND km.id_kelas = kp.id_kelas
        AND km.id_mahasiswa = cs.student_id
       WHERE cs.student_id = $1
         AND j.id = $2
         AND cs.status = 'AKTIF'
         AND cl.status = 'AKTIF'
         ${filter}
       ORDER BY cl.id ASC
       LIMIT 1`,
      params,
    );

    if (!result.rows.length) {
      throw new Error('CLASS_NOT_FOUND_FOR_STUDENT');
    }

    return result.rows[0];
  }

  async updateProgress({
    studentId,
    jobsheetId,
    classId,
    kelasPraktikumId,
    experimentId,
    instructionId,
    activityType,
    metadata = {},
  }) {
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      classId,
      kelasPraktikumId,
    );

    // Fetch jobsheet details to get course_id (which acts as module_id) and theory content
    const jobsheetRes = await this._pool.query(
      'SELECT course_id, content FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );

    if (!jobsheetRes.rows.length) {
      throw new Error('JOBSHEET_NOT_FOUND');
    }

    const courseId = jobsheetRes.rows[0].course_id;
    const content = jobsheetRes.rows[0].content || {};
    const theoryCount = Array.isArray(content.theory) ? content.theory.length : 0;

    // Fetch counts of experiments and exercises
    const expRes = await this._pool.query(
      'SELECT COUNT(*) FROM experiments WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const exeRes = await this._pool.query(
      'SELECT COUNT(*) FROM exercises WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const expCount = parseInt(expRes.rows[0].count, 10) || 0;
    const exeCount = parseInt(exeRes.rows[0].count, 10) || 0;

    const totalSteps = theoryCount + expCount + exeCount + 1; // +1 for the report/task page

    // Fetch completed_steps from student_progress table
    const progressRes = await this._pool.query(
      `SELECT completed_items, status FROM student_progress
       WHERE student_id = $1 AND jobsheet_id = $2 AND class_id = $3`,
      [studentId, jobsheetId, academicContext.class_id],
    );

    let completedSteps = 0;
    let isStudentProgressCompleted = false;

    if (progressRes.rows.length > 0) {
      const row = progressRes.rows[0];
      const completedItems = Array.isArray(row.completed_items) ? row.completed_items : [];
      const uniqueItems = new Set(completedItems.map((item) => `${item.type}-${item.id}`));
      completedSteps = uniqueItems.size;

      if (row.status === 'SELESAI') {
        isStudentProgressCompleted = true;
      }
    }

    const progressPercentage = totalSteps > 0 ? parseFloat(((completedSteps / totalSteps) * 100).toFixed(2)) : 0;

    // Check existing snapshot
    const snapshotRes = await this._pool.query(
      `SELECT first_opened_at, completed_at, status FROM student_jobsheet_progress
       WHERE student_id = $1 AND class_id = $2 AND jobsheet_id = $3`,
      [studentId, academicContext.class_id, jobsheetId],
    );

    let firstOpenedAt = snapshotRes.rows.length > 0 ? snapshotRes.rows[0].first_opened_at : null;
    let completedAt = snapshotRes.rows.length > 0 ? snapshotRes.rows[0].completed_at : null;
    let existingStatus = snapshotRes.rows.length > 0 ? snapshotRes.rows[0].status : null;

    if (!firstOpenedAt) {
      firstOpenedAt = new Date();
    }

    let status = 'in_progress';
    if (isStudentProgressCompleted || progressPercentage >= 100 || activityType === 'submit_answer' || existingStatus === 'completed') {
      status = 'completed';
      if (!completedAt) {
        completedAt = new Date();
      }
    }

    // Insert new activity log
    const logId = `log-${randomUUID().slice(0, 8)}`;
    await this._pool.query(
      `INSERT INTO student_jobsheet_activity_logs (id, student_id, jobsheet_id, experiment_id, instruction_id, activity_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        logId,
        studentId,
        jobsheetId,
        experimentId || null,
        instructionId || null,
        activityType,
        JSON.stringify(metadata),
      ],
    );

    // Upsert jobsheet progress snapshot
    const progressId = `prog-${randomUUID().slice(0, 8)}`;
    const updateResult = await this._pool.query(
      `UPDATE student_jobsheet_progress
       SET id_kelas_mhs = COALESCE(id_kelas_mhs, $5),
           current_experiment_id = COALESCE($8, current_experiment_id),
           current_instruction_id = COALESCE($9, current_instruction_id),
           completed_steps = $10,
           total_steps = $11,
           progress_percentage = $12,
           status = $13,
           last_activity_at = CURRENT_TIMESTAMP,
           completed_at = COALESCE(completed_at, $15)
       WHERE student_id = $2
         AND jobsheet_id = $7
         AND (
           ($4::varchar IS NOT NULL AND id_kelas_praktikum = $4)
           OR ($4::varchar IS NULL AND class_id = $3)
         )
       RETURNING *`,
      [
        progressId,
        studentId,
        academicContext.class_id,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        courseId,
        jobsheetId,
        experimentId || null,
        instructionId || null,
        completedSteps,
        totalSteps,
        progressPercentage,
        status,
        firstOpenedAt,
        completedAt,
      ],
    );

    if (updateResult.rows.length) return updateResult.rows[0];

    const result = await this._pool.query(
      `INSERT INTO student_jobsheet_progress (
        id, student_id, class_id, id_kelas_praktikum, id_kelas_mhs, module_id, jobsheet_id,
        current_experiment_id, current_instruction_id,
        completed_steps, total_steps, progress_percentage, status,
        first_opened_at, last_activity_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, $15)
      RETURNING *`,
      [
        progressId,
        studentId,
        academicContext.class_id,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        courseId,
        jobsheetId,
        experimentId || null,
        instructionId || null,
        completedSteps,
        totalSteps,
        progressPercentage,
        status,
        firstOpenedAt,
        completedAt,
      ],
    );

    return result.rows[0];
  }

  async _resolveClassProgressContext(classId, kelasPraktikumId) {
    if (!kelasPraktikumId) {
      return { class_id: classId, id_kelas_praktikum: null };
    }

    const result = await this._pool.query(
      `SELECT id AS id_kelas_praktikum, legacy_class_id AS class_id
       FROM kelas_praktikum
       WHERE id = $1 AND legacy_class_id IS NOT NULL
       LIMIT 1`,
      [kelasPraktikumId],
    );

    if (!result.rows.length) {
      throw new Error('CLASS_NOT_FOUND');
    }

    return result.rows[0];
  }

  async getClassProgress(jobsheetId, classId, kelasPraktikumId = null) {
    const classContext = await this._resolveClassProgressContext(classId, kelasPraktikumId);

    // 1. Fetch jobsheet content & experiments & exercises
    const jobsheetRes = await this._pool.query(
      'SELECT content FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );
    const theoryList = (jobsheetRes.rows[0]?.content?.theory) || [];

    const experimentsRes = await this._pool.query(
      'SELECT id, title FROM experiments WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const exercisesRes = await this._pool.query(
      'SELECT id, title FROM exercises WHERE jobsheet_id = $1',
      [jobsheetId],
    );

    const experimentMap = new Map(experimentsRes.rows.map((e) => [e.id, e.title]));
    const exerciseMap = new Map(exercisesRes.rows.map((e) => [e.id, e.title]));
    const theoryMap = new Map(theoryList.map((t, idx) => [t.id || `theory-${idx}`, t.title || `Teori ${idx + 1}`]));

    // 2. Fetch all students and their progress snapshot
    const query = `
      SELECT
        u.id AS student_id,
        u.fullname,
        sp.nim,
        u.avatar_url,
        sjp.current_experiment_id,
        sjp.current_instruction_id,
        COALESCE(sjp.completed_steps, 0) AS completed_steps,
        COALESCE(sjp.total_steps, 0) AS total_steps,
        COALESCE(sjp.progress_percentage, 0.0) AS progress_percentage,
        sjp.first_opened_at,
        sjp.last_activity_at,
        sjp.completed_at,
        CASE
          WHEN sjp.status = 'completed' THEN 'completed'
          WHEN sjp.last_activity_at IS NOT NULL AND (NOW() - sjp.last_activity_at) >= INTERVAL '20 minutes' THEN 'stalled'
          WHEN sjp.status IS NOT NULL THEN sjp.status
          ELSE 'not_started'
        END AS status
      FROM class_students cs
      JOIN users u ON cs.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN student_jobsheet_progress sjp 
        ON cs.student_id = sjp.student_id 
        AND sjp.class_id = cs.class_id
        AND ($3::varchar IS NULL OR sjp.id_kelas_praktikum = $3)
        AND sjp.jobsheet_id = $1
      WHERE cs.class_id = $2
        AND cs.status = 'AKTIF'
        AND u.is_active = true
      ORDER BY u.fullname ASC
    `;

    const result = await this._pool.query(query, [
      jobsheetId,
      classContext.class_id,
      classContext.id_kelas_praktikum,
    ]);

    // Summary statistics counters
    let notStartedCount = 0;
    let inProgressCount = 0;
    let stalledCount = 0;
    let completedCount = 0;

    const students = result.rows.map((student) => {
      // Map user friendly current position title
      let currentPositionTitle = 'Belum Mulai';
      if (student.status === 'completed') {
        currentPositionTitle = 'Selesai';
        completedCount++;
      } else if (student.status === 'not_started') {
        currentPositionTitle = 'Belum Mulai';
        notStartedCount++;
      } else if (student.status === 'stalled') {
        stalledCount++;
      } else if (student.status === 'in_progress') {
        inProgressCount++;
      }

      // If in progress or stalled, resolve details
      if (student.status === 'in_progress' || student.status === 'stalled') {
        if (student.current_experiment_id) {
          currentPositionTitle = experimentMap.get(student.current_experiment_id) || 'Percobaan';
        } else if (student.current_instruction_id) {
          if (student.current_instruction_id === 'task') {
            currentPositionTitle = 'Laporan Praktikum';
          } else if (theoryMap.has(student.current_instruction_id)) {
            currentPositionTitle = theoryMap.get(student.current_instruction_id);
          } else if (exerciseMap.has(student.current_instruction_id)) {
            currentPositionTitle = exerciseMap.get(student.current_instruction_id);
          } else {
            currentPositionTitle = 'Detail';
          }
        }
      }

      return {
        ...student,
        current_position_title: currentPositionTitle,
      };
    });

    return {
      summary: {
        totalStudents: students.length,
        notStartedCount,
        inProgressCount,
        stalledCount,
        completedCount,
      },
      students,
    };
  }

  async getStudentDetailProgress(jobsheetId, studentId, classId, kelasPraktikumId = null) {
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      classId,
      kelasPraktikumId,
    );

    // 1. Fetch student info
    const studentRes = await this._pool.query(
      `SELECT u.fullname, u.email, sp.nim, u.avatar_url
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.id = $1`,
      [studentId],
    );

    if (!studentRes.rows.length) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    const studentInfo = studentRes.rows[0];

    // 2. Fetch progress info
    const progressRes = await this._pool.query(
      `SELECT
        COALESCE(completed_steps, 0) AS completed_steps,
        COALESCE(total_steps, 0) AS total_steps,
        COALESCE(progress_percentage, 0.0) AS progress_percentage,
        first_opened_at,
        last_activity_at,
        completed_at,
        CASE
          WHEN status = 'completed' THEN 'completed'
          WHEN last_activity_at IS NOT NULL AND (NOW() - last_activity_at) >= INTERVAL '20 minutes' THEN 'stalled'
          WHEN status IS NOT NULL THEN status
          ELSE 'not_started'
        END AS status
       FROM student_jobsheet_progress
       WHERE student_id = $1 AND jobsheet_id = $2 AND class_id = $3`,
      [studentId, jobsheetId, academicContext.class_id],
    );

    const progressInfo = progressRes.rows[0] || {
      completed_steps: 0,
      total_steps: 0,
      progress_percentage: 0,
      first_opened_at: null,
      last_activity_at: null,
      completed_at: null,
      status: 'not_started',
    };

    // 3. Fetch maps for labeling
    const jobsheetRes = await this._pool.query(
      'SELECT content FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );
    const theoryList = (jobsheetRes.rows[0]?.content?.theory) || [];

    const experimentsRes = await this._pool.query(
      'SELECT id, title FROM experiments WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const exercisesRes = await this._pool.query(
      'SELECT id, title FROM exercises WHERE jobsheet_id = $1',
      [jobsheetId],
    );

    const experimentMap = new Map(experimentsRes.rows.map((e) => [e.id, e.title]));
    const exerciseMap = new Map(exercisesRes.rows.map((e) => [e.id, e.title]));
    const theoryMap = new Map(theoryList.map((t, idx) => [t.id || `theory-${idx}`, t.title || `Teori ${idx + 1}`]));

    // 4. Fetch activity logs
    const logsRes = await this._pool.query(
      `SELECT experiment_id, instruction_id, activity_type, metadata, created_at
       FROM student_jobsheet_activity_logs
       WHERE student_id = $1 AND jobsheet_id = $2
       ORDER BY created_at DESC
       LIMIT 30`,
      [studentId, jobsheetId],
    );

    const logs = logsRes.rows.map((log) => {
      let description = `Aktivitas: ${log.activity_type}`;

      switch (log.activity_type) {
        case 'open_jobsheet':
        case 'workspace_opened':
          description = 'Membuka workspace jobsheet';
          break;
        case 'workspace_closed':
          description = 'Menutup workspace jobsheet';
          break;
        case 'open_instruction':
          if (log.instruction_id === 'task') {
            description = 'Membuka halaman Laporan Praktikum';
          } else if (exerciseMap.has(log.instruction_id)) {
            description = `Membuka Latihan: ${exerciseMap.get(log.instruction_id)}`;
          } else {
            description = `Membuka Teori: ${theoryMap.get(log.instruction_id) || 'Halaman Teori'}`;
          }
          break;
        case 'open_experiment':
          description = `Membuka Percobaan: ${experimentMap.get(log.experiment_id) || 'Halaman Percobaan'}`;
          break;
        case 'run_code':
          description = 'Menjalankan kode program';
          break;
        case 'save_code':
          description = 'Menyimpan jawaban kode';
          break;
        case 'complete_instruction':
          if (log.instruction_id === 'task') {
            description = 'Menyelesaikan halaman Laporan Praktikum';
          } else if (exerciseMap.has(log.instruction_id)) {
            description = `Menyelesaikan Latihan: ${exerciseMap.get(log.instruction_id)}`;
          } else {
            description = `Menyelesaikan Teori: ${theoryMap.get(log.instruction_id) || 'Halaman Teori'}`;
          }
          break;
        case 'complete_experiment':
          description = `Menyelesaikan Percobaan: ${experimentMap.get(log.experiment_id) || 'Halaman Percobaan'}`;
          break;
        case 'submit_answer':
          description = 'Mengirimkan Laporan Praktikum (Selesai)';
          break;
      }

      return {
        ...log,
        description,
      };
    });

    return {
      student: studentInfo,
      progress: progressInfo,
      logs,
    };
  }
}

module.exports = StudentJobsheetProgressService;
