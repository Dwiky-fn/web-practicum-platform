const pool = require('..');
const { AuthorizationError, InvariantError, NotFoundError } = require('../../../exceptions');
const JobsheetProgressScoringService = require('../../scoring/JobsheetProgressScoringService');

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function textFromTipTap(node) {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  return asArray(node.content).map(textFromTipTap).join(' ').replace(/\s+/g, ' ').trim();
}

function extractOrderedSteps(content) {
  const steps = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'orderedList') {
      asArray(node.content).forEach((item) => {
        const text = textFromTipTap(item);
        if (text) steps.push(text);
      });
      return;
    }
    asArray(node.content).forEach(walk);
  };
  walk(content);
  return steps;
}

function hasText(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value) return false;
  return JSON.stringify(value).replace(/\s/g, '').length > 20;
}

function isStepComplete(step) {
  const files = asObject(step?.files);
  const hasCode = Object.values(files).some((code) => String(code || '').trim().length > 0);
  return hasCode && hasText(step?.output) && hasText(step?.analysis);
}

function initialFromName(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join('') || '?';
}

function parseDate(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function mapSubmissionLabel(row) {
  if (!row?.submission_id) return null;
  if (row.submission_status === 'REVIEWED') return 'Direview';
  if (row.submission_status === 'SUBMITTED' && row.is_auto_submitted) return 'Dikumpulkan Otomatis';
  if (row.submission_status === 'SUBMITTED') return 'Dikumpulkan Manual';
  return row.submission_status || null;
}

function formatInactiveDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return 'Belum ada aktivitas';
  }
  if (seconds < 60) {
    return 'kurang dari 1 menit';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} hari ${remainingHours} jam` : `${days} hari`;
}

class MonitoringService {
  constructor() {
    this._pool = pool;
  }

  async _assertLecturerAccess(kelasPraktikumId, lecturerId, client = this._pool) {
    const result = await client.query(
      `SELECT 1
       FROM pengampu
       WHERE id_kelas_praktikum = $1
         AND id_dosen = $2
       LIMIT 1`,
      [kelasPraktikumId, lecturerId],
    );

    if (!result.rows.length) {
      throw new AuthorizationError('Anda tidak memiliki akses untuk memantau mahasiswa pada kelas ini.');
    }
  }

  async _resolveContext(kelasPraktikumId, jobsheetId, lecturerId, client = this._pool) {
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId, client);

    const result = await client.query(
      `SELECT
         kp.id AS kelas_praktikum_id,
         kp.nama_kelas,
         k.kelas AS rombel,
         mk.nama_mk,
         ts.tahun_semester,
         j.id AS jobsheet_id,
         j.title AS jobsheet_title,
         j.content,
         j.programming_language,
         jc.deadline,
         CASE
           WHEN jc.deadline IS NULL THEN false
           ELSE (NOW() AT TIME ZONE 'Asia/Jakarta') > jc.deadline
         END AS is_deadline_passed
       FROM kelas_praktikum kp
       JOIN mata_kuliah mk ON mk.id = kp.id_mata_kuliah
       JOIN kelas k ON k.id = kp.id_kelas
       JOIN tahun_semester ts ON ts.id = kp.id_tahun_semester
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $2
        AND jc.is_active = true
       JOIN jobsheets j ON j.id = jc.jobsheet_id
       WHERE kp.id = $1
       LIMIT 1`,
      [kelasPraktikumId, jobsheetId],
    );

    if (!result.rows.length) {
      throw new NotFoundError('Jobsheet tidak ditemukan pada kelas praktikum ini.');
    }

    const row = result.rows[0];
    return {
      kelasPraktikumId: row.kelas_praktikum_id,
      jobsheetId: row.jobsheet_id,
      className: `${row.nama_mk} - ${row.rombel || row.nama_kelas}`,
      jobsheetTitle: row.jobsheet_title,
      academicPeriod: row.tahun_semester,
      deadline: row.deadline,
      isDeadlinePassed: Boolean(row.is_deadline_passed),
      content: row.content || {},
      programmingLanguage: row.programming_language || 'java',
    };
  }

  async _getAttempts(kelasPraktikumId, jobsheetId, lecturerId, client = this._pool) {
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId, client);
    const result = await client.query(
      `SELECT id, title, status, start_at, end_at
       FROM jobsheet_remedials
       WHERE jobsheet_id = $1
         AND id_kelas_praktikum = $2
       ORDER BY created_at ASC`,
      [jobsheetId, kelasPraktikumId],
    );

    return [
      { attemptType: 'normal', remedialId: null, label: 'Pengerjaan Normal' },
      ...result.rows.map((row, index) => ({
        attemptType: 'remedial',
        remedialId: row.id,
        label: `Remedial ${index + 1} - ${row.title || 'Tanpa Judul'}`,
        status: row.status,
        startAt: row.start_at,
        endAt: row.end_at,
      })),
    ];
  }

  _resolveAttemptScope(query = {}) {
    const attemptType = query.attemptType === 'remedial' || query.remedialId ? 'remedial' : 'normal';
    return {
      attemptType,
      remedialId: attemptType === 'remedial' ? (query.remedialId || null) : null,
      label: attemptType === 'remedial' ? 'Remedial' : 'Pengerjaan Normal',
    };
  }

  async _validateAttemptScope(kelasPraktikumId, jobsheetId, lecturerId, query, client = this._pool) {
    const scope = this._resolveAttemptScope(query);
    const attempts = await this._getAttempts(kelasPraktikumId, jobsheetId, lecturerId, client);

    if (scope.attemptType === 'normal') {
      return { ...attempts[0], attempts };
    }

    if (!scope.remedialId) {
      throw new InvariantError('remedialId wajib disertakan untuk tampilan remedial.');
    }

    const remedial = attempts.find((item) => item.remedialId === scope.remedialId);
    if (!remedial) {
      throw new NotFoundError('Sesi remedial tidak ditemukan pada kelas praktikum ini.');
    }

    return { ...remedial, attempts };
  }

  async _getStructure(jobsheetId, content = {}, client = this._pool) {
    const [experimentsRes, exercisesRes] = await Promise.all([
      client.query(
        `SELECT id, title, instruction_content, template_code, rubric
         FROM experiments
         WHERE jobsheet_id = $1
         ORDER BY id ASC`,
        [jobsheetId],
      ),
      client.query(
        `SELECT id, title, instruction_content, template_code, rubric
         FROM exercises
         WHERE jobsheet_id = $1
         ORDER BY id ASC`,
        [jobsheetId],
      ),
    ]);

    const theory = asArray(content.theory).map((item, index) => ({
      type: 'theory',
      moduleType: 'theory',
      moduleId: item.id || `theory-${index}`,
      stepId: null,
      title: item.title || `Dasar Teori ${index + 1}`,
      instruction: item.content || item.description || '',
    }));

    const experimentGroups = experimentsRes.rows.map((experiment, index) => {
      const steps = extractOrderedSteps(experiment.instruction_content);
      const children = (steps.length ? steps : [experiment.title || `Percobaan ${index + 1}`]).map((instruction, stepIndex) => ({
        type: 'experiment-step',
        moduleType: 'experiment',
        moduleId: experiment.id,
        stepId: `${experiment.id}:step:${stepIndex + 1}`,
        stepIndex,
        title: `${experiment.title || `Percobaan ${index + 1}`} - Langkah ${stepIndex + 1}`,
        instruction,
      }));
      return {
        id: experiment.id,
        title: experiment.title || `Percobaan ${index + 1}`,
        children,
      };
    });

    const exercises = exercisesRes.rows.map((exercise, index) => ({
      type: 'exercise',
      moduleType: 'exercise',
      moduleId: exercise.id,
      stepId: null,
      title: exercise.title || `Latihan ${index + 1}`,
      instruction: exercise.instruction_content || '',
    }));

    return {
      groups: [
        { id: 'theory', title: 'Dasar Teori', children: theory },
        ...experimentGroups.map((group, index) => ({
          id: `experiment-${group.id}`,
          title: group.title || `Percobaan ${index + 1}`,
          children: group.children,
        })),
        { id: 'exercise', title: 'Latihan', children: exercises },
      ],
      items: [
        ...theory,
        ...experimentGroups.flatMap((group) => group.children),
        ...exercises,
      ],
    };
  }

  async _getStudents(kelasPraktikumId, jobsheetId, attemptScope, client = this._pool) {
    const remedialJoin = attemptScope.attemptType === 'remedial'
      ? `JOIN jobsheet_remedial_students jrs
           ON jrs.student_id = km.id_mahasiswa
          AND jrs.remedial_id = $3`
      : '';
    const params = attemptScope.attemptType === 'remedial'
      ? [kelasPraktikumId, jobsheetId, attemptScope.remedialId]
      : [kelasPraktikumId, jobsheetId];
    const remedialCondition = attemptScope.attemptType === 'remedial'
      ? 'remedial_id = $3'
      : 'remedial_id IS NULL';

    const result = await client.query(
      `SELECT
         u.id AS student_id,
         u.fullname,
         u.avatar_url,
         spf.nim,
         km.id AS id_kelas_mhs,
         sjp.module_id,
         sjp.current_experiment_id,
         sjp.current_instruction_id,
         sjp.status AS progress_status,
         sjp.last_activity_at,
         sjp.first_opened_at,
         sjp.completed_at,
         sjp.progress_percentage,
         spr.progress,
         spr.last_page,
         spr.last_activity,
         COALESCE(spr.completed_items, '[]'::jsonb) AS completed_items,
         ts.id AS submission_id,
         ts.status AS submission_status,
         ts.submission_source,
         ts.is_auto_submitted,
         ts.attempt_no,
         ts.attempt_type,
         ts.remedial_id AS submission_remedial_id,
         ts.submitted_at,
         ts.auto_submitted_at,
         ts.calculated_progress_score,
         ts.score_breakdown,
         ts.report_html,
         sr.final_score
       FROM kelas_praktikum kp
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.status = 'active'
       ${remedialJoin}
       JOIN users u ON u.id = km.id_mahasiswa AND u.is_active = true
       LEFT JOIN student_profiles spf ON spf.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT *
         FROM student_jobsheet_progress
         WHERE student_id = km.id_mahasiswa
           AND jobsheet_id = $2
           AND id_kelas_praktikum = kp.id
           AND ${remedialCondition}
         ORDER BY last_activity_at DESC NULLS LAST, updated_at DESC NULLS LAST
         LIMIT 1
       ) sjp ON true
       LEFT JOIN LATERAL (
         SELECT *
         FROM student_progress
         WHERE student_id = km.id_mahasiswa
           AND jobsheet_id = $2
           AND id_kelas_praktikum = kp.id
           AND ${remedialCondition}
         ORDER BY last_activity DESC NULLS LAST
         LIMIT 1
       ) spr ON true
       LEFT JOIN LATERAL (
         SELECT *
         FROM task_submissions
         WHERE student_id = km.id_mahasiswa
           AND jobsheet_id = $2
           AND id_kelas_praktikum = kp.id
           AND ${remedialCondition}
         ORDER BY submitted_at DESC NULLS LAST, id DESC
         LIMIT 1
       ) ts ON true
       LEFT JOIN LATERAL (
         SELECT final_score
         FROM submission_reviews
         WHERE submission_id = ts.id
         ORDER BY id DESC
         LIMIT 1
       ) sr ON true
       WHERE kp.id = $1
       ORDER BY u.fullname ASC`,
      params,
    );

    return result.rows.map((row) => ({
      ...row,
      initials: initialFromName(row.fullname),
      completed_items: asArray(row.completed_items),
      report: this._parseReport(row.report_html),
      lastUpdatedAt: row.last_activity_at || row.last_activity || row.submitted_at || null,
    }));
  }

  _parseReport(reportHtml) {
    if (!reportHtml) return {};
    if (typeof reportHtml === 'object') return reportHtml;
    try {
      return JSON.parse(reportHtml);
    } catch (error) {
      return {};
    }
  }

  _isCompleted(student, item) {
    const completedItems = asArray(student.completed_items);
    if (completedItems.some((completed) => completed.type === item.moduleType && completed.id === item.moduleId)) {
      if (item.type !== 'experiment-step') return true;
    }

    if (item.type === 'experiment-step') {
      const step = student.report?.experiments?.[item.moduleId]?.steps?.[item.stepIndex];
      return isStepComplete(step);
    }

    if (item.type === 'exercise') {
      return Boolean(student.report?.exercises?.[item.moduleId]);
    }

    return completedItems.some((completed) => completed.type === item.moduleType && completed.id === item.moduleId);
  }

  _activeLocation(student, items) {
    if (!student.first_opened_at && !student.last_activity_at && !student.last_page) return null;

    if (student.current_instruction_id) {
      const direct = items.find((item) => item.moduleId === student.current_instruction_id);
      if (direct) return direct;
    }

    if (student.current_experiment_id) {
      const steps = items.filter((item) => item.type === 'experiment-step' && item.moduleId === student.current_experiment_id);
      return steps.find((item) => !this._isCompleted(student, item)) || steps[steps.length - 1] || null;
    }

    if (student.module_id) {
      const byModule = items.find((item) => item.moduleId === student.module_id || item.stepId === student.module_id);
      if (byModule) return byModule;
    }

    const lastPage = String(student.last_page || '');
    return items.find((item) => lastPage.includes(item.moduleId)) || null;
  }

  _submissionStatus(student) {
    if (student.submission_status === 'REVIEWED') return 'Direview';
    if (student.submission_status === 'SUBMITTED') {
      return student.is_auto_submitted ? 'Dikumpulkan Otomatis' : 'Dikumpulkan Manual';
    }
    if (student.first_opened_at || student.last_activity_at || student.last_activity) return 'Sedang Mengerjakan';
    return 'Belum Memulai';
  }

  _classifyStudentForItem(student, item, items) {
    const active = this._activeLocation(student, items);
    const isActiveHere = active && active.type === item.type && active.moduleId === item.moduleId && active.stepId === item.stepId;
    if (isActiveHere) return 'active_here';
    if (this._isCompleted(student, item)) return 'completed_here';
    if (!student.first_opened_at && !student.last_activity_at && !student.last_activity && !student.submission_id) return 'not_started_here';
    return 'elsewhere';
  }

  _publicStudent(student, status = null) {
    return {
      studentId: student.student_id,
      name: student.fullname,
      nim: student.nim || '-',
      profilePhotoUrl: student.avatar_url || null,
      initials: student.initials,
      status: status || this._submissionStatus(student),
      lastUpdatedAt: student.lastUpdatedAt,
    };
  }

  _buildSidebar(groups, items, students) {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((item) => {
        const classified = students.map((student) => ({
          student,
          status: this._classifyStudentForItem(student, item, items),
        }));
        const active = classified
          .filter((entry) => entry.status === 'active_here')
          .sort((left, right) => {
            const statusWeight = this._submissionStatus(left.student) === 'Sedang Mengerjakan' ? -1 : 0;
            const otherStatusWeight = this._submissionStatus(right.student) === 'Sedang Mengerjakan' ? -1 : 0;
            if (statusWeight !== otherStatusWeight) return statusWeight - otherStatusWeight;
            const timeDiff = parseDate(right.student.lastUpdatedAt) - parseDate(left.student.lastUpdatedAt);
            if (timeDiff !== 0) return timeDiff;
            if (!left.student.submission_id && right.student.submission_id) return -1;
            if (left.student.submission_id && !right.student.submission_id) return 1;
            return String(left.student.fullname).localeCompare(String(right.student.fullname));
          });

        return {
          ...item,
          activeCount: active.length,
          completedCount: classified.filter((entry) => entry.status === 'completed_here').length,
          notStartedCount: classified.filter((entry) => entry.status === 'not_started_here').length,
          elsewhereCount: classified.filter((entry) => entry.status === 'elsewhere').length,
          avatars: active.slice(0, 3).map((entry) => this._publicStudent(entry.student, 'Sedang / Terakhir Aktif di Lokasi Ini')),
          remainingAvatarCount: Math.max(0, active.length - 3),
          remainingAvatars: active.slice(3, 10).map((entry) => this._publicStudent(entry.student, 'Sedang / Terakhir Aktif di Lokasi Ini')),
        };
      }),
    }));
  }

  _summary(students) {
    return {
      totalStudents: students.length,
      inProgress: students.filter((student) => this._submissionStatus(student) === 'Sedang Mengerjakan').length,
      submittedManual: students.filter((student) => student.submission_status === 'SUBMITTED' && !student.is_auto_submitted).length,
      submittedAutomatic: students.filter((student) => student.submission_status === 'SUBMITTED' && student.is_auto_submitted).length,
      waitingReview: students.filter((student) => student.submission_status === 'SUBMITTED').length,
      reviewed: students.filter((student) => student.submission_status === 'REVIEWED').length,
      notStarted: students.filter((student) => this._submissionStatus(student) === 'Belum Memulai').length,
    };
  }

  _insights(sidebar) {
    const items = sidebar.flatMap((group) => group.children);
    const mostActive = [...items].sort((a, b) => b.activeCount - a.activeCount)[0] || null;
    const mostNotStarted = [...items].sort((a, b) => b.notStartedCount - a.notStartedCount)[0] || null;
    return {
      mostActiveLocation: mostActive ? { title: mostActive.title, count: mostActive.activeCount } : null,
      mostNotStartedLocation: mostNotStarted ? { title: mostNotStarted.title, count: mostNotStarted.notStartedCount } : null,
    };
  }

  async getMonitoring({ kelasPraktikumId, jobsheetId, lecturerId, query = {} }) {
    const context = await this._resolveContext(kelasPraktikumId, jobsheetId, lecturerId);
    const attempt = await this._validateAttemptScope(kelasPraktikumId, jobsheetId, lecturerId, query);
    const structure = await this._getStructure(jobsheetId, context.content);
    const students = await this._getStudents(kelasPraktikumId, jobsheetId, attempt);
    const sidebar = this._buildSidebar(structure.groups, structure.items, students);

    return {
      context,
      attemptScope: {
        attemptType: attempt.attemptType,
        remedialId: attempt.remedialId,
        label: attempt.label,
      },
      attempts: attempt.attempts,
      summary: this._summary(students),
      sidebar,
      insights: this._insights(sidebar),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  _findLocation(items, query) {
    const moduleType = query.moduleType;
    const moduleId = query.moduleId;
    const stepId = query.stepId || null;
    const item = items.find((candidate) => (
      candidate.moduleType === moduleType
      && candidate.moduleId === moduleId
      && (candidate.stepId || null) === stepId
    ));
    if (!item) throw new NotFoundError('Lokasi jobsheet tidak ditemukan.');
    return item;
  }

  async getLocationDetail({ kelasPraktikumId, jobsheetId, lecturerId, query = {} }) {
    const context = await this._resolveContext(kelasPraktikumId, jobsheetId, lecturerId);
    const attempt = await this._validateAttemptScope(kelasPraktikumId, jobsheetId, lecturerId, query);
    const structure = await this._getStructure(jobsheetId, context.content);
    const location = this._findLocation(structure.items, query);
    const students = await this._getStudents(kelasPraktikumId, jobsheetId, attempt);

    const rows = students.map((student) => {
      const rawStatus = this._classifyStudentForItem(student, location, structure.items);
      const labelMap = {
        active_here: 'Sedang Mengerjakan',
        completed_here: 'Sudah Selesai',
        not_started_here: 'Belum Memulai',
        elsewhere: 'Berada di Lokasi Lain',
      };
      return {
        ...this._publicStudent(student, labelMap[rawStatus]),
        locationStatus: rawStatus,
        progressScore: student.calculated_progress_score != null ? Number(student.calculated_progress_score) : null,
        submissionId: student.submission_id || null,
        submissionStatus: student.submission_status || null,
        submissionLabel: mapSubmissionLabel(student),
      };
    });

    return {
      context,
      attemptScope: {
        attemptType: attempt.attemptType,
        remedialId: attempt.remedialId,
        label: attempt.label,
      },
      location,
      statistics: {
        activeCount: rows.filter((row) => row.locationStatus === 'active_here').length,
        completedCount: rows.filter((row) => row.locationStatus === 'completed_here').length,
        notStartedCount: rows.filter((row) => row.locationStatus === 'not_started_here').length,
        elsewhereCount: rows.filter((row) => row.locationStatus === 'elsewhere').length,
      },
      students: rows,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async getStudentWorkpage({ kelasPraktikumId, jobsheetId, studentId, lecturerId, query = {} }) {
    const context = await this._resolveContext(kelasPraktikumId, jobsheetId, lecturerId);
    const attempt = await this._validateAttemptScope(kelasPraktikumId, jobsheetId, lecturerId, query);
    const students = await this._getStudents(kelasPraktikumId, jobsheetId, attempt);
    const student = students.find((item) => item.student_id === studentId);
    if (!student) {
      throw new NotFoundError('Mahasiswa tidak ditemukan pada kelas praktikum ini.');
    }
    const structure = await this._getStructure(jobsheetId, context.content);
    const logsResult = await this._pool.query(
      `SELECT experiment_id, instruction_id, activity_type, metadata, created_at
       FROM student_jobsheet_activity_logs
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND COALESCE(remedial_id, '') = COALESCE($3, '')
         AND activity_type NOT IN ('workspace_opened', 'workspace_closed')
       ORDER BY created_at DESC
       LIMIT 50`,
      [studentId, jobsheetId, attempt.remedialId],
    );

    const logsRows = logsResult.rows;
    const uniqueLogs = [];
    for (const log of logsRows) {
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

    let progressScore = student.calculated_progress_score != null ? {
      progressScore: Number(student.calculated_progress_score),
      items: student.score_breakdown?.items || [],
      calculatedAt: student.score_breakdown?.calculatedAt || null,
    } : null;

    if (!progressScore && student.first_opened_at) {
      progressScore = await JobsheetProgressScoringService.calculate({
        studentId,
        jobsheetId,
        kelasPraktikumId,
        idKelasMhs: student.id_kelas_mhs,
        attemptType: attempt.attemptType,
        attemptNo: attempt.attemptType === 'remedial' ? 2 : 1,
        remedialId: attempt.remedialId,
      });
    }

    const activeType = query.activeType;
    const activeId = query.activeId;

    let runCountQuery = `
      SELECT COUNT(*)::integer AS count
      FROM student_jobsheet_activity_logs
      WHERE student_id = $1
        AND jobsheet_id = $2
        AND activity_type = 'run_code'
        AND (${attempt.remedialId ? 'remedial_id = $3' : 'remedial_id IS NULL'})
    `;
    const runCountParams = attempt.remedialId ? [studentId, jobsheetId, attempt.remedialId] : [studentId, jobsheetId];

    if (activeType && activeId) {
      if (activeType === 'experiments' || activeType === 'experiment') {
        runCountQuery += ` AND experiment_id = $${runCountParams.length + 1}`;
        runCountParams.push(activeId);
      } else if (activeType === 'exercises' || activeType === 'exercise' || activeType === 'theory') {
        runCountQuery += ` AND instruction_id = $${runCountParams.length + 1}`;
        runCountParams.push(activeId);
      }
    } else if (activeType === 'task') {
      runCountQuery += ` AND instruction_id = 'task'`;
    }

    const runCountRes = await this._pool.query(runCountQuery, runCountParams);
    const runCount = runCountRes.rows[0]?.count || 0;

    const lastActivityRes = await this._pool.query(
      `SELECT created_at
       FROM student_jobsheet_activity_logs
       WHERE student_id = $1
         AND jobsheet_id = $2
         AND activity_type NOT IN ('workspace_opened', 'workspace_closed')
         AND (${attempt.remedialId ? 'remedial_id = $3' : 'remedial_id IS NULL'})
       ORDER BY created_at DESC
       LIMIT 1`,
      attempt.remedialId ? [studentId, jobsheetId, attempt.remedialId] : [studentId, jobsheetId],
    );

    const hasActivity = lastActivityRes.rows.length > 0;
    let lastMeaningfulActivityAt = null;
    let inactiveDurationSeconds = null;
    let inactiveLabel = 'Belum ada aktivitas';

    if (hasActivity) {
      lastMeaningfulActivityAt = lastActivityRes.rows[0].created_at;
      const lastActiveDate = new Date(lastMeaningfulActivityAt);
      const nowDate = new Date();
      inactiveDurationSeconds = Math.max(0, Math.floor((nowDate.getTime() - lastActiveDate.getTime()) / 1000));
      inactiveLabel = formatInactiveDuration(inactiveDurationSeconds);
    }

    return {
      context,
      attemptScope: {
        attemptType: attempt.attemptType,
        remedialId: attempt.remedialId,
        label: attempt.label,
      },
      attempts: attempt.attempts,
      student: this._publicStudent(student),
      status: this._submissionStatus(student),
      progress: {
        progressPercentage: Number(student.progress_percentage || student.progress || 0),
        completedItems: student.completed_items,
        currentLocation: this._activeLocation(student, structure.items),
        firstOpenedAt: student.first_opened_at,
        lastUpdatedAt: student.lastUpdatedAt,
        completedAt: student.completed_at,
      },
      submission: {
        id: student.submission_id || null,
        status: student.submission_status || null,
        label: mapSubmissionLabel(student),
        submittedAt: student.submitted_at || null,
        isAutoSubmitted: Boolean(student.is_auto_submitted),
        attemptNo: student.attempt_no || null,
        attemptType: student.attempt_type || attempt.attemptType,
        remedialId: student.submission_remedial_id || attempt.remedialId || null,
        finalScore: student.final_score != null ? Number(student.final_score) : null,
        progressScore,
        report: student.report,
      },
      structure: structure.groups,
      logs: uniqueLogs,
      monitoringStats: {
        runCount,
        lastMeaningfulActivityAt,
        inactiveDurationSeconds,
        inactiveLabel,
        hasActivity,
      },
      readOnly: true,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

module.exports = MonitoringService;
