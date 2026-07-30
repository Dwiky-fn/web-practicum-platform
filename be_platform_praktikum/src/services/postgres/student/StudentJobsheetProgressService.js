const pool = require('..');
const { randomUUID } = require('crypto');
const DeadlineAccessService = require('./DeadlineAccessService');
const JobsheetProgressScoringService = require('../../scoring/JobsheetProgressScoringService');
const MonitoringActivityService = require('../../monitoring/MonitoringActivityService');

function normalizeModuleId(value) {
  if (!value) return null;
  return String(value).slice(0, 20);
}

function resolveModuleId({
  moduleId,
  jobsheetId,
  experimentId,
  instructionId,
}) {
  return normalizeModuleId(
    moduleId
    || experimentId
    || instructionId
    || `jobsheet:${jobsheetId}`,
  );
}

function resolveStudentMonitoringStatus(context = {}) {
  const submissionStatus = String(context.submissionStatus || '').toUpperCase();
  const hasSubmittedAttempt = ['SUBMITTED', 'REVIEWED'].includes(submissionStatus);

  if (hasSubmittedAttempt) {
    return {
      status: 'completed',
      label: 'Selesai',
      submissionLabel: context.isAutoSubmitted || context.submissionSource === 'auto_deadline'
        ? 'Dikumpulkan Otomatis'
        : 'Dikumpulkan Manual',
    };
  }

  if (context.isDeadlinePassed) {
    return {
      status: 'overdue',
      label: 'Terlambat',
      submissionLabel: null,
    };
  }

  const hasRealProgressOrPosition = Boolean(
    context.currentExperimentId
    || context.currentInstructionId
    || Number(context.progressPercentage || 0) > 0
    || Number(context.completedSteps || 0) > 0
    || (Array.isArray(context.completedItems) && context.completedItems.length > 0),
  );

  if (hasRealProgressOrPosition) {
    return {
      status: 'in_progress',
      label: 'Mengerjakan',
      submissionLabel: null,
    };
  }

  return {
    status: 'not_started',
    label: 'Belum Mulai',
    submissionLabel: null,
  };
}

class StudentJobsheetProgressService {
  constructor() {
    this._pool = pool;
  }

  async _isDuplicateRecentActivity({
    studentId,
    jobsheetId,
    experimentId,
    instructionId,
    activityType,
    activeRemedialId,
  }) {
    const result = await this._pool.query(
      `SELECT 1
       FROM student_jobsheet_activity_logs
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND COALESCE(experiment_id, '') = COALESCE($3, '')
         AND COALESCE(instruction_id, '') = COALESCE($4, '')
         AND activity_type = $5
         AND COALESCE(remedial_id, '') = COALESCE($6, '')
         AND created_at >= NOW() - INTERVAL '5 seconds'
       LIMIT 1`,
      [
        studentId,
        jobsheetId,
        experimentId || null,
        instructionId || null,
        activityType,
        activeRemedialId || null,
      ],
    );

    return result.rows.length > 0;
  }

  async _resolveAcademicContext(studentId, jobsheetId, kelasPraktikumId) {
    if (!kelasPraktikumId) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    const nativeResult = await this._pool.query(
      `SELECT
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM kelas_praktikum kp
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $3
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       LEFT JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $1
       WHERE kp.id = $2
       LIMIT 1`,
      [studentId, kelasPraktikumId, jobsheetId],
    );

    if (!nativeResult.rows.length) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    if (!nativeResult.rows[0].id_kelas_mhs) {
      throw new Error('Mahasiswa belum terdaftar pada kelas semester ini.');
    }

    return nativeResult.rows[0];
  }

  async _ensureLecturerCanAccessKelasPraktikum(kelasPraktikumId, lecturerId) {
    if (!lecturerId) return;

    const result = await this._pool.query(
      `SELECT 1
       FROM pengampu
       WHERE id_kelas_praktikum = $1
         AND id_dosen = $2
       LIMIT 1`,
      [kelasPraktikumId, lecturerId],
    );

    if (!result.rows.length) {
      throw new Error('Anda tidak memiliki akses ke kelas praktikum ini.');
    }
  }

  _buildAssessmentItems(content = {}, experiments = [], exercises = []) {
    const theoryItems = Array.isArray(content.theory) ? content.theory : [];
    return [
      ...theoryItems.map((item, index) => ({
        id: item.id || `theory-${index}`,
        type: 'theory',
        title: item.title || `Subtopik ${index + 1}`,
        weight: Number(item.rubric) || 0,
      })),
      ...experiments.map((item, index) => ({
        id: item.id,
        type: 'experiment',
        title: item.title || `Percobaan ${index + 1}`,
        weight: Number(item.rubric) || 0,
      })),
      ...exercises.map((item, index) => ({
        id: item.id,
        type: 'exercise',
        title: item.title || `Latihan ${index + 1}`,
        weight: Number(item.rubric) || 0,
      })),
    ];
  }

  _calculateProgressScore(assessmentItems, completedItems = []) {
    const completedSet = new Set(
      (Array.isArray(completedItems) ? completedItems : [])
        .map((item) => `${item.type}-${item.id}`),
    );

    const items = assessmentItems.map((item) => {
      const progress = completedSet.has(`${item.type}-${item.id}`) ? 1 : 0;
      const score = Number((item.weight * progress).toFixed(2));
      return {
        ...item,
        progress,
        score,
        completed: progress === 1,
      };
    });

    return {
      progressScore: Number(items.reduce((total, item) => total + item.score, 0).toFixed(2)),
      maxScore: 100,
      items,
    };
  }

  async updateProgress({
    studentId,
    jobsheetId,
    kelasPraktikumId,
    moduleId,
    experimentId,
    instructionId,
    activityType,
    metadata = {},
    attemptType = null,
    remedialId = null,
  }) {
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      kelasPraktikumId,
    );
    const writeAccess = await DeadlineAccessService.assertCanSaveProgress({
      studentId,
      jobsheetId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      attemptType,
      remedialId,
    });

    const jobsheetRes = await this._pool.query(
      'SELECT id_mata_kuliah, content FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );

    if (!jobsheetRes.rows.length) {
      throw new Error('JOBSHEET_NOT_FOUND');
    }

    const resolvedModuleId = resolveModuleId({
      moduleId,
      jobsheetId,
      experimentId,
      instructionId,
    });

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

    const activeRemedialId = writeAccess.remedialId;
    let attemptNo = writeAccess.attemptNo || 1;
    const resolvedAttemptType =
      writeAccess.attemptType || attemptType || 'normal';

    if (activeRemedialId) {
      const checkProgress = await this._pool.query(
        `SELECT attempt_no FROM student_jobsheet_progress
         WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3 AND remedial_id = $4
         LIMIT 1`,
        [studentId, jobsheetId, academicContext.id_kelas_praktikum, activeRemedialId],
      );
      if (checkProgress.rows.length) {
        attemptNo = checkProgress.rows[0].attempt_no;
      }
    }

    // Fetch completed_steps from student_progress table matching active attempt
    const progressRes = await this._pool.query(
      `SELECT completed_items, status FROM student_progress
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
         AND (${activeRemedialId ? 'remedial_id = $4' : 'remedial_id IS NULL'})`,
      activeRemedialId
        ? [studentId, jobsheetId, academicContext.id_kelas_praktikum, activeRemedialId]
        : [studentId, jobsheetId, academicContext.id_kelas_praktikum],
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
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
         AND (${activeRemedialId ? 'remedial_id = $4' : 'remedial_id IS NULL'})`,
      activeRemedialId
        ? [studentId, jobsheetId, academicContext.id_kelas_praktikum, activeRemedialId]
        : [studentId, jobsheetId, academicContext.id_kelas_praktikum],
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

    const shouldLogActivity = !['workspace_opened', 'workspace_closed'].includes(activityType)
      && !(await this._isDuplicateRecentActivity({
        studentId,
        jobsheetId,
        experimentId,
        instructionId,
        activityType,
        activeRemedialId,
      }));

    const exerciseId = metadata?.moduleType === 'exercise' || metadata?.sectionType === 'exercise'
      ? (instructionId || metadata?.exerciseId || null)
      : null;

    if (shouldLogActivity) {
      const logId = `log-${randomUUID().slice(0, 8)}`;
      await this._pool.query(
        `INSERT INTO student_jobsheet_activity_logs (
           id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs,
           experiment_id, exercise_id, instruction_id, activity_type, metadata,
           attempt_no, attempt_type, remedial_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          logId,
          studentId,
          jobsheetId,
          academicContext.id_kelas_praktikum,
          academicContext.id_kelas_mhs,
          experimentId || null,
          exerciseId,
          exerciseId ? null : (instructionId || null),
          activityType,
          JSON.stringify(metadata),
          attemptNo,
          resolvedAttemptType,
          activeRemedialId,
        ],
      );
    }

    // Upsert jobsheet progress snapshot
    const progressId = `prog-${randomUUID().slice(0, 8)}`;
    const updateResult = await this._pool.query(
      `UPDATE student_jobsheet_progress
       SET id_kelas_mhs = COALESCE(id_kelas_mhs, $4),
           module_id = $5,
           current_experiment_id = COALESCE($6, current_experiment_id),
           current_instruction_id = COALESCE($7, current_instruction_id),
           completed_steps = $8,
           total_steps = $9,
           progress_percentage = $10,
           status = $11,
           last_activity_at = CURRENT_TIMESTAMP,
           completed_at = COALESCE(completed_at, $12)
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
         AND (${activeRemedialId ? 'remedial_id = $13' : 'remedial_id IS NULL'})
       RETURNING *`,
      [
        studentId,
        jobsheetId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        resolvedModuleId,
        experimentId || null,
        instructionId || null,
        completedSteps,
        totalSteps,
        progressPercentage,
        status,
        completedAt,
        ...(activeRemedialId ? [activeRemedialId] : []),
      ],
    );

    if (updateResult.rows.length) {
      await MonitoringActivityService.broadcastActivity({
        kelasPraktikumId: academicContext.id_kelas_praktikum,
        studentId,
        jobsheetId,
        experimentId: experimentId || null,
        exerciseId,
        instructionId: exerciseId ? null : (instructionId || null),
        activityType,
        lastActiveAt: new Date(),
        progressPercentage,
      });
      return updateResult.rows[0];
    }

    const result = await this._pool.query(
      `INSERT INTO student_jobsheet_progress (
        id, student_id, id_kelas_praktikum, id_kelas_mhs, module_id, jobsheet_id,
        current_experiment_id, current_instruction_id,
        completed_steps, total_steps, progress_percentage, status,
        first_opened_at, last_activity_at, completed_at, attempt_no, attempt_type, remedial_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, $14, $15, $16, $17)
      RETURNING *`,
      [
        progressId,
        studentId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        resolvedModuleId,
        jobsheetId,
        experimentId || null,
        instructionId || null,
        completedSteps,
        totalSteps,
        progressPercentage,
        status,
        firstOpenedAt,
        completedAt,
        attemptNo,
        resolvedAttemptType,
        activeRemedialId,
      ],
    );

    await MonitoringActivityService.broadcastActivity({
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      studentId,
      jobsheetId,
      experimentId: experimentId || null,
      exerciseId,
      instructionId: exerciseId ? null : (instructionId || null),
      activityType,
      lastActiveAt: new Date(),
      progressPercentage,
    });

    return result.rows[0];
  }

  async getClassProgress(jobsheetId, kelasPraktikumId, lecturerId = null) {
    await this._ensureLecturerCanAccessKelasPraktikum(kelasPraktikumId, lecturerId);

    // 1. Fetch jobsheet content & experiments & exercises
    const jobsheetRes = await this._pool.query(
      `SELECT
         j.content,
         jc.deadline,
         CASE
           WHEN jc.deadline IS NULL THEN false
           ELSE (NOW() AT TIME ZONE 'Asia/Jakarta') > jc.deadline
         END AS is_deadline_passed
       FROM jobsheets j
       LEFT JOIN jobsheet_classes jc
         ON jc.jobsheet_id = j.id
        AND jc.id_kelas_praktikum = $2
        AND jc.is_active = true
       WHERE j.id = $1
       LIMIT 1`,
      [jobsheetId, kelasPraktikumId],
    );
    const theoryList = (jobsheetRes.rows[0]?.content?.theory) || [];
    const isDeadlinePassed = Boolean(jobsheetRes.rows[0]?.is_deadline_passed);

    const experimentsRes = await this._pool.query(
      'SELECT id, title, rubric FROM experiments WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const exercisesRes = await this._pool.query(
      'SELECT id, title, rubric FROM exercises WHERE jobsheet_id = $1',
      [jobsheetId],
    );

    const experimentMap = new Map(experimentsRes.rows.map((e) => [e.id, e.title]));
    const exerciseMap = new Map(exercisesRes.rows.map((e) => [e.id, e.title]));
    const theoryMap = new Map(theoryList.map((t, idx) => [t.id || `theory-${idx}`, t.title || `Teori ${idx + 1}`]));
    const assessmentItems = this._buildAssessmentItems(
      jobsheetRes.rows[0]?.content || {},
      experimentsRes.rows,
      exercisesRes.rows,
    );

    // 2. Fetch all students and their progress snapshot.
    const query = `
      SELECT
        u.id AS student_id,
        km.id AS id_kelas_mhs,
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
        sjp.attempt_no,
        sjp.attempt_type,
        sjp.remedial_id,
        ts.id AS submission_id,
        ts.status AS submission_status,
        ts.submission_source,
        ts.is_auto_submitted,
        ts.auto_submitted_at,
        ts.submitted_at,
        ts.calculated_progress_score,
        ts.score_breakdown,
        COALESCE(spr.completed_items, '[]'::jsonb) AS completed_items,
        spr.last_activity,
        activity_log.latest_activity_log_at,
        sjp.status AS progress_status
      FROM kelas_praktikum kp
      JOIN kelas_semester ks
        ON ks.id_tahun_semester = kp.id_tahun_semester
       AND ks.id_semester = kp.id_semester
       AND ks.id_kelas = kp.id_kelas
      JOIN kelas_mhs km
        ON km.id_kelas_semester = ks.id
      JOIN users u ON km.id_mahasiswa = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM student_jobsheet_progress
        WHERE student_id = km.id_mahasiswa
          AND id_kelas_praktikum = kp.id
          AND jobsheet_id = $1
        ORDER BY attempt_no DESC
        LIMIT 1
      ) sjp ON true
      LEFT JOIN LATERAL (
        SELECT * FROM student_progress
        WHERE student_id = km.id_mahasiswa
          AND id_kelas_praktikum = kp.id
          AND jobsheet_id = $1
        ORDER BY attempt_no DESC
        LIMIT 1
      ) spr ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM task_submissions
        WHERE student_id = km.id_mahasiswa
          AND id_kelas_praktikum = kp.id
          AND jobsheet_id = $1
          AND remedial_id IS NULL
        ORDER BY submitted_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) ts ON true
      LEFT JOIN LATERAL (
        SELECT MAX(created_at) AS latest_activity_log_at
        FROM student_jobsheet_activity_logs
        WHERE student_id = km.id_mahasiswa
          AND jobsheet_id = $1
          AND COALESCE(remedial_id, '') = COALESCE(ts.remedial_id, '')
      ) activity_log ON true
      WHERE kp.id = $2
        AND LOWER(COALESCE(km.status, 'active')) = 'active'
        AND u.is_active = true
      ORDER BY u.fullname ASC
    `;

    const result = await this._pool.query(query, [jobsheetId, kelasPraktikumId]);

    // Summary statistics counters
    let notStartedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    const students = await Promise.all(result.rows.map(async (student) => {
      const monitoringStatus = resolveStudentMonitoringStatus({
        submissionStatus: student.submission_status,
        submissionSource: student.submission_source,
        isAutoSubmitted: student.is_auto_submitted,
        isDeadlinePassed,
        firstOpenedAt: student.first_opened_at,
        lastActivityAt: student.last_activity_at,
        lastActivity: student.last_activity,
        latestActivityLogAt: student.latest_activity_log_at,
        currentExperimentId: student.current_experiment_id,
        currentInstructionId: student.current_instruction_id,
        progressPercentage: student.progress_percentage,
        completedSteps: student.completed_steps,
      });

      // Map user friendly current position title
      let currentPositionTitle = 'Belum ada aktivitas';
      if (student.current_experiment_id) {
        currentPositionTitle = experimentMap.get(student.current_experiment_id) || 'Percobaan';
      } else if (student.current_instruction_id) {
        if (student.current_instruction_id === 'task') {
          currentPositionTitle = 'Pengerjaan Mahasiswa';
        } else if (theoryMap.has(student.current_instruction_id)) {
          currentPositionTitle = theoryMap.get(student.current_instruction_id);
        } else if (exerciseMap.has(student.current_instruction_id)) {
          currentPositionTitle = exerciseMap.get(student.current_instruction_id);
        } else {
          currentPositionTitle = 'Detail';
        }
      } else if (monitoringStatus.status === 'in_progress') {
        currentPositionTitle = 'Aktivitas tersimpan';
      }

      if (monitoringStatus.status === 'completed') {
        completedCount++;
      } else if (monitoringStatus.status === 'not_started') {
        notStartedCount++;
      } else if (monitoringStatus.status === 'overdue') {
        overdueCount++;
      } else if (monitoringStatus.status === 'in_progress') {
        inProgressCount++;
      }

      const dynamicScore = student.calculated_progress_score != null
        ? {
          progressScore: Number(student.calculated_progress_score),
          totalWeight: Number(student.score_breakdown?.totalWeight || 100),
          completedWeight: Number(student.calculated_progress_score),
          items: student.score_breakdown?.items || [],
          calculatedAt: student.score_breakdown?.calculatedAt || null,
        }
        : await JobsheetProgressScoringService.calculate({
          studentId: student.student_id,
          jobsheetId,
          kelasPraktikumId,
          idKelasMhs: student.id_kelas_mhs,
          attemptType: student.attempt_type || 'normal',
          attemptNo: student.attempt_no || 1,
          remedialId: student.remedial_id || null,
        });

      return {
        ...student,
        status: monitoringStatus.status,
        monitoring_status: monitoringStatus.status,
        monitoring_label: monitoringStatus.label,
        submission_label: monitoringStatus.submissionLabel,
        current_position_title: currentPositionTitle,
        progress_score: dynamicScore.progressScore,
        score_breakdown: dynamicScore,
      };
    }));

    return {
      summary: {
        totalStudents: students.length,
        notStartedCount,
        inProgressCount,
        overdueCount,
        stalledCount: overdueCount,
        completedCount,
      },
      students,
    };
  }

  async getStudentDetailProgress(jobsheetId, studentId, kelasPraktikumId, lecturerId = null) {
    await this._ensureLecturerCanAccessKelasPraktikum(kelasPraktikumId, lecturerId);

    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
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
        attempt_no,
        attempt_type,
        remedial_id,
        CASE
          WHEN status = 'completed' THEN 'completed'
          WHEN last_activity_at IS NOT NULL AND (NOW() - last_activity_at) >= INTERVAL '20 minutes' THEN 'stalled'
          WHEN status IS NOT NULL THEN status
          ELSE 'not_started'
       END AS status
       FROM student_jobsheet_progress
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
       ORDER BY attempt_no DESC
       LIMIT 1`,
      [studentId, jobsheetId, academicContext.id_kelas_praktikum],
    );

    const progressInfo = progressRes.rows[0] || {
      completed_steps: 0,
      total_steps: 0,
      progress_percentage: 0,
      first_opened_at: null,
      last_activity_at: null,
      completed_at: null,
      status: 'not_started',
      attempt_no: 1,
      attempt_type: 'normal',
      remedial_id: null,
    };

    // 3. Fetch maps for labeling
    const jobsheetRes = await this._pool.query(
      'SELECT content FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );
    const theoryList = (jobsheetRes.rows[0]?.content?.theory) || [];

    const experimentsRes = await this._pool.query(
      'SELECT id, title, rubric FROM experiments WHERE jobsheet_id = $1',
      [jobsheetId],
    );
    const exercisesRes = await this._pool.query(
      'SELECT id, title, rubric FROM exercises WHERE jobsheet_id = $1',
      [jobsheetId],
    );

    const experimentMap = new Map(experimentsRes.rows.map((e) => [e.id, e.title]));
    const exerciseMap = new Map(exercisesRes.rows.map((e) => [e.id, e.title]));
    const theoryMap = new Map(theoryList.map((t, idx) => [t.id || `theory-${idx}`, t.title || `Teori ${idx + 1}`]));
    const assessmentItems = this._buildAssessmentItems(
      jobsheetRes.rows[0]?.content || {},
      experimentsRes.rows,
      exercisesRes.rows,
    );

    const studentProgressRes = await this._pool.query(
      `SELECT completed_items
       FROM student_progress
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND id_kelas_praktikum = $3
       ORDER BY attempt_no DESC
       LIMIT 1`,
      [studentId, jobsheetId, academicContext.id_kelas_praktikum],
    );
    const progressScore = await JobsheetProgressScoringService.calculate({
      studentId,
      jobsheetId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
      idKelasMhs: academicContext.id_kelas_mhs,
      attemptType: progressInfo.attempt_type || 'normal',
      attemptNo: progressInfo.attempt_no || 1,
      remedialId: progressInfo.remedial_id || null,
    });

    // 4. Fetch activity logs
    const isNotStarted = progressInfo.status === 'not_started' || Number(progressInfo.progress_percentage || 0) === 0;
    const logsRes = isNotStarted
      ? { rows: [] }
      : await this._pool.query(
        `SELECT experiment_id, instruction_id, activity_type, metadata, created_at
         FROM student_jobsheet_activity_logs
         WHERE student_id = $1
           AND jobsheet_id = $2
           AND COALESCE(remedial_id, '') = COALESCE($3, '')
           AND activity_type NOT IN ('workspace_opened', 'workspace_closed')
         ORDER BY created_at DESC
         LIMIT 30`,
        [studentId, jobsheetId, progressInfo.remedial_id || ''],
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

    const uniqueLogs = [];
    for (const log of logs) {
      if (uniqueLogs.length === 0) {
        uniqueLogs.push(log);
      } else {
        const last = uniqueLogs[uniqueLogs.length - 1];
        const isDuplicate = last.activity_type === log.activity_type
          && last.experiment_id === log.experiment_id
          && last.instruction_id === log.instruction_id
          && Math.abs(new Date(last.created_at).getTime() - new Date(log.created_at).getTime()) < 3000;
        if (!isDuplicate) {
          uniqueLogs.push(log);
        }
      }
    }

    return {
      student: studentInfo,
      progress: progressInfo,
      progressScore,
      logs: uniqueLogs,
    };
  }
}

module.exports = StudentJobsheetProgressService;
module.exports.resolveStudentMonitoringStatus = resolveStudentMonitoringStatus;
