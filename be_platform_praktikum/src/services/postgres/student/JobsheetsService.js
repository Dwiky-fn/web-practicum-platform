const pool = require('..');
const DeadlineAccessService = require('./DeadlineAccessService');

const emptyDoc = { type: 'doc', content: [] };

const languageMeta = (language) => {
  const normalized = language === 'python' ? 'python' : 'java';
  return {
    programming_language: normalized,
    programming_language_display_name: normalized === 'python' ? 'Python' : 'Java',
    programming_language_file_extension: normalized === 'python' ? 'py' : 'java',
  };
};

class JobsheetsService {
  constructor() {
    this._pool = pool;
  }

  _mapJobsheet(row, experiments = [], exercises = []) {
    const content = row.content || {};

    return {
      ...row,
      editorMode: row.editor_mode || 'mini_ide',
      editor_mode: row.editor_mode || 'mini_ide',
      summary: content.summary || emptyDoc,
      theory: content.theory || [],
      task: content.task || {
        experimentIds: experiments.map((experiment) => experiment.id),
        exerciseIds: exercises.map((exercise) => exercise.id),
        instructionContent: emptyDoc,
        requireSelfDeclaration: false,
        conclusionConfig: {
          enabled: true,
          required: false,
        },
      },
      experiments,
      exercises,
      ...languageMeta(row.programming_language),
    };
  }

  async _hydrateJobsheets(rows) {
    const jobsheetIds = rows.map((jobsheet) => jobsheet.id);

    if (!jobsheetIds.length) {
      return [];
    }

    const experimentsRes = await this._pool.query(
      `SELECT
        id,
        jobsheet_id,
        title,
        instruction_content,
        template_code,
        template_code AS default_template_code,
        rubric
      FROM experiments
      WHERE jobsheet_id = ANY($1)
      ORDER BY jobsheet_id ASC, id ASC`,
      [jobsheetIds],
    );

    const exercisesRes = await this._pool.query(
      `SELECT
        id,
        jobsheet_id,
        title,
        instruction_content,
        template_code,
        template_code AS default_template_code,
        rubric
      FROM exercises
      WHERE jobsheet_id = ANY($1)
      ORDER BY jobsheet_id ASC, id ASC`,
      [jobsheetIds],
    );

    const experimentsByJobsheet = new Map();
    const exercisesByJobsheet = new Map();

    experimentsRes.rows.forEach((experiment) => {
      const list = experimentsByJobsheet.get(experiment.jobsheet_id) || [];
      list.push(experiment);
      experimentsByJobsheet.set(experiment.jobsheet_id, list);
    });

    exercisesRes.rows.forEach((exercise) => {
      const list = exercisesByJobsheet.get(exercise.jobsheet_id) || [];
      list.push(exercise);
      exercisesByJobsheet.set(exercise.jobsheet_id, list);
    });

    return rows.map((jobsheet) => this._mapJobsheet(
      jobsheet,
      experimentsByJobsheet.get(jobsheet.id) || [],
      exercisesByJobsheet.get(jobsheet.id) || [],
    ));
  }

  async getJobsheetsByMataKuliah(mataKuliahId, kelasPraktikumId = null, user = null) {
    if (user?.role === 'MAHASISWA') {
      const params = [mataKuliahId, user.id];
      let kelasFilter = '';
      if (kelasPraktikumId) {
        params.push(kelasPraktikumId);
        kelasFilter = `AND kp.id = $${params.length}`;
      }

      const result = await this._pool.query(
        `
        SELECT
          j.id,
          j.id_mata_kuliah,
          j.title,
          j.description,
          j.goal,
          j.content,
          j.status,
          j.programming_language,
          j.editor_mode,
          jc.id_kelas_praktikum,
          km.id AS id_kelas_mhs,
          to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline
        FROM jobsheets j
        JOIN jobsheet_classes jc
          ON jc.jobsheet_id = j.id
         AND jc.is_active = true
         AND jc.status = 'PUBLISHED'
        JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
        JOIN kelas_semester ks
          ON ks.id_tahun_semester = kp.id_tahun_semester
         AND ks.id_semester = kp.id_semester
         AND ks.id_kelas = kp.id_kelas
        JOIN kelas_mhs km
          ON km.id_kelas_semester = ks.id
         AND km.id_mahasiswa = $2
         AND km.status = 'active'
        WHERE j.id_mata_kuliah = $1
          AND kp.id_mata_kuliah = $1
          AND j.status = 'PUBLISHED'
          ${kelasFilter}
         ORDER BY j.created_at ASC
        `,
        params,
      );

      const jobsheets = await this._hydrateJobsheets(result.rows);
      for (const js of jobsheets) {
        js.access = await this.getJobsheetAccess(user.id, js.id, kelasPraktikumId || js.id_kelas_praktikum);
      }
      return jobsheets;
    }

    const result = await this._pool.query(
      `
      SELECT
        j.id,
        j.id_mata_kuliah,
        j.title,
        j.description,
        j.goal,
        j.content,
        j.status,
        j.programming_language,
        j.editor_mode,
        MIN(jc.id_kelas_praktikum) AS id_kelas_praktikum,
        to_char(MIN(jc.deadline), 'YYYY-MM-DD HH24:MI:SS') AS deadline
      FROM jobsheets j
      LEFT JOIN jobsheet_classes jc ON jc.jobsheet_id = j.id AND jc.is_active = true
      WHERE j.id_mata_kuliah = $1
      GROUP BY j.id, j.created_at
      ORDER BY j.created_at ASC
      `,
      [mataKuliahId],
    );

    return this._hydrateJobsheets(result.rows);
  }

  async getJobsheetAccess(studentId, jobsheetId, kelasPraktikumId) {
    if (!kelasPraktikumId) {
      return {
        accessMode: 'editable_normal',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
        message: '',
      };
    }

    // 1. Check active remedial
    const remedialQuery = await this._pool.query(
      `SELECT jr.id, jr.title, jr.end_at, jrs.status AS remedial_student_status
       FROM jobsheet_remedials jr
       JOIN jobsheet_remedial_students jrs ON jrs.remedial_id = jr.id
       WHERE jr.jobsheet_id = $1 
         AND jr.id_kelas_praktikum = $2 
         AND jrs.student_id = $3
         AND jr.status = 'open'
         AND (NOW() AT TIME ZONE 'Asia/Jakarta') BETWEEN jr.start_at AND jr.end_at
       LIMIT 1`,
      [jobsheetId, kelasPraktikumId, studentId]
    );

    if (remedialQuery.rows.length) {
      const activeRemedial = remedialQuery.rows[0];
      const remedialId = activeRemedial.id;

      // Get submission for this remedial
      const subQuery = await this._pool.query(
        `SELECT ts.id, ts.status, ts.attempt_no, ts.attempt_label, sr.decision
         FROM task_submissions ts
         LEFT JOIN LATERAL (
           SELECT decision FROM submission_reviews
           WHERE submission_id = ts.id
           ORDER BY id DESC
           LIMIT 1
         ) sr ON true
         WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.id_kelas_praktikum = $3 AND ts.remedial_id = $4
         LIMIT 1`,
        [studentId, jobsheetId, kelasPraktikumId, remedialId]
      );

      if (subQuery.rows.length) {
        const sub = subQuery.rows[0];
        if (sub.status === 'SUBMITTED') {
          if (sub.decision && sub.decision !== 'PENDING') {
            return {
              accessMode: 'readonly_reviewed',
              canEdit: false,
              canSaveProgress: false,
              canSubmit: false,
              attemptType: 'remedial',
              attemptNo: sub.attempt_no,
              attemptLabel: `Remedial ${Math.max(1, Number(sub.attempt_no || 2) - 1)}`,
              remedialId,
            };
          }
          return {
            accessMode: 'readonly_submitted',
            canEdit: false,
            canSaveProgress: false,
            canSubmit: false,
            attemptType: 'remedial',
            attemptNo: sub.attempt_no,
            attemptLabel: `Remedial ${Math.max(1, Number(sub.attempt_no || 2) - 1)}`,
            remedialId,
          };
        }

        // Draft remedial submission
        return {
          accessMode: 'editable_remedial',
          canEdit: true,
          canSaveProgress: true,
          canSubmit: true,
          attemptType: 'remedial',
          attemptNo: sub.attempt_no,
          attemptLabel: `Remedial ${Math.max(1, Number(sub.attempt_no || 2) - 1)}`,
          remedialId,
          remedialEndAt: activeRemedial.end_at,
        };
      }

      const access = await DeadlineAccessService.resolveAttemptAccess({
        studentId,
        jobsheetId,
        kelasPraktikumId,
      });
      return access;
    }

    // 2. No active remedial. Check normal deadline.
    const deadlineQuery = await this._pool.query(
      `SELECT
         to_char(deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline,
         CASE
           WHEN deadline IS NULL THEN false
           ELSE (NOW() AT TIME ZONE 'Asia/Jakarta') > deadline
         END AS is_deadline_passed
       FROM jobsheet_classes
       WHERE jobsheet_id = $1 AND id_kelas_praktikum = $2`,
      [jobsheetId, kelasPraktikumId]
    );

    let isDeadlinePassed = false;
    let deadlineStr = null;
    if (deadlineQuery.rows.length) {
      deadlineStr = deadlineQuery.rows[0].deadline;
      isDeadlinePassed = Boolean(deadlineQuery.rows[0].is_deadline_passed);
    }

    // Get normal submission
    const normalSubQuery = await this._pool.query(
      `SELECT ts.id, ts.status, ts.attempt_no, ts.attempt_label, sr.decision
       FROM task_submissions ts
       LEFT JOIN LATERAL (
         SELECT decision FROM submission_reviews
         WHERE submission_id = ts.id
         ORDER BY id DESC
         LIMIT 1
       ) sr ON true
       WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.id_kelas_praktikum = $3 AND ts.remedial_id IS NULL
       LIMIT 1`,
      [studentId, jobsheetId, kelasPraktikumId]
    );

    if (normalSubQuery.rows.length) {
      const sub = normalSubQuery.rows[0];
      if (sub.status === 'SUBMITTED') {
        if (sub.decision && sub.decision !== 'PENDING') {
          return {
            accessMode: 'readonly_reviewed',
            canEdit: false,
            canSaveProgress: false,
            canSubmit: false,
            attemptType: 'normal',
            attemptNo: sub.attempt_no,
            attemptLabel: 'Pengerjaan Normal',
          };
        }
        return {
          accessMode: 'readonly_submitted',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'normal',
          attemptNo: sub.attempt_no,
          attemptLabel: 'Pengerjaan Normal',
        };
      }

      // It is DRAFT normal submission
      if (isDeadlinePassed) {
        return {
          accessMode: 'locked_deadline',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          message: 'Deadline pengerjaan telah berakhir.',
          attemptType: 'normal',
          attemptNo: sub.attempt_no,
          attemptLabel: 'Pengerjaan Normal',
        };
      }

      return {
        accessMode: 'editable_normal',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
        attemptType: 'normal',
        attemptNo: sub.attempt_no,
        attemptLabel: 'Pengerjaan Normal',
      };
    }

    // No submission yet
    if (isDeadlinePassed) {
      return {
        accessMode: 'locked_deadline',
        canEdit: false,
        canSaveProgress: false,
        canSubmit: false,
        message: 'Deadline pengerjaan telah berakhir.',
        attemptType: 'normal',
        attemptNo: 1,
        attemptLabel: 'Pengerjaan Normal',
      };
    }

    return {
      accessMode: 'editable_normal',
      canEdit: true,
      canSaveProgress: true,
      canSubmit: true,
      attemptType: 'normal',
      attemptNo: 1,
      attemptLabel: 'Pengerjaan Normal',
    };
  }

  async getJobsheetFullByMataKuliah(jobsheetId, mataKuliahId, kelasPraktikumId = null, user = null) {
    const jobsheets = await this.getJobsheetsByMataKuliah(mataKuliahId, kelasPraktikumId, user);
    const jobsheet = jobsheets.find((item) => item.id === jobsheetId);
    if (!jobsheet) {
      throw new Error('Jobsheet tidak tersedia untuk kelas Anda.');
    }
    if (user && user.role === 'MAHASISWA') {
      jobsheet.access = await this.getJobsheetAccess(user.id, jobsheetId, kelasPraktikumId || jobsheet.id_kelas_praktikum);
    } else {
      jobsheet.access = {
        accessMode: 'editable_normal',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
      };
    }
    return jobsheet;
  }
}

module.exports = JobsheetsService;
