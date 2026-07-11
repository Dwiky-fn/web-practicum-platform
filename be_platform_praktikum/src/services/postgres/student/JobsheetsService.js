const pool = require('..');
const DeadlineAccessService = require('./DeadlineAccessService');
const { ClientError, NotFoundError } = require('../../../exceptions');

const emptyDoc = { type: 'doc', content: [] };

const languageMeta = (language) => {
  const normalized = language === 'python' ? 'python' : 'java';
  return {
    programming_language: normalized,
    programming_language_display_name: normalized === 'python' ? 'Python' : 'Java',
    programming_language_file_extension: normalized === 'python' ? 'py' : 'java',
  };
};

function isCompletedSubmissionStatus(row = {}) {
  return Boolean(
    ['SUBMITTED', 'REVIEWED', 'ACCEPTED', 'REVISION', 'REVIEWING'].includes(row.status)
    || row.submitted_at
    || row.submittedAt
  );
}

class JobsheetsService {
  constructor() {
    this._pool = pool;
  }

  _mapJobsheet(row, experiments = [], exercises = []) {
    const content = row.content || {};

    return {
      ...row,
      editorMode: 'mini_ide',
      editor_mode: 'mini_ide',
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
        rubric,
        inactive_duration_minutes
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
        rubric,
        inactive_duration_minutes
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
          jc.status,
          j.programming_language,
          j.editor_mode,
          jc.id_kelas_praktikum,
          km.id AS id_kelas_mhs,
          jc.urutan,
          to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline
        FROM jobsheets j
        JOIN jobsheet_classes jc
          ON jc.jobsheet_id = j.id
         AND jc.is_active = true
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
          ${kelasFilter}
         ORDER BY jc.urutan ASC NULLS LAST, j.created_at ASC
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

  async getJobsheetAccess(studentId, jobsheetId, kelasPraktikumId, remedialId = null, attemptType = null) {
    if (!kelasPraktikumId) {
      return {
        accessMode: 'editable_normal',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
        message: '',
      };
    }
    const sequenceAccess = await this._resolveSequenceAccess(studentId, jobsheetId, kelasPraktikumId);
    if (!sequenceAccess.canOpen) {
      return {
        accessMode: 'locked_sequence',
        canEdit: false,
        canSaveProgress: false,
        canSubmit: false,
        message: sequenceAccess.message,
      };
    }

    return DeadlineAccessService.resolveAttemptAccess({
      studentId,
      jobsheetId,
      kelasPraktikumId,
      remedialId,
      attemptType,
    });
  }

  async _resolveSequenceAccess(studentId, jobsheetId, kelasPraktikumId) {
    const current = await this._pool.query(
      `SELECT id, urutan, status, is_active
       FROM jobsheet_classes
       WHERE jobsheet_id = $1
         AND id_kelas_praktikum = $2
       LIMIT 1`,
      [jobsheetId, kelasPraktikumId],
    );

    if (!current.rows.length || current.rows[0].status !== 'PUBLISHED' || !current.rows[0].is_active) {
      return { canOpen: false, message: 'Jobsheet belum dipublish.' };
    }

    const sequence = Number(current.rows[0].urutan || 0);
    if (!sequence) return { canOpen: true, message: '' };

    const previous = await this._pool.query(
      `SELECT jc.jobsheet_id, jc.urutan
       FROM jobsheet_classes jc
       WHERE jc.id_kelas_praktikum = $1
         AND jc.urutan < $2
         AND jc.is_active = true
       ORDER BY jc.urutan ASC`,
      [kelasPraktikumId, sequence],
    );

    for (const item of previous.rows) {
      const done = await this._pool.query(
        `SELECT 1
         FROM task_submissions
         WHERE student_id = $1
           AND jobsheet_id = $2
           AND id_kelas_praktikum = $3
           AND remedial_id IS NULL
           AND (
             status IN ('SUBMITTED', 'REVIEWED', 'ACCEPTED', 'REVISION', 'REVIEWING')
             OR submitted_at IS NOT NULL
           )
         LIMIT 1`,
        [studentId, item.jobsheet_id, kelasPraktikumId],
      );
      if (!done.rows.length) {
        return { canOpen: false, message: 'Selesaikan jobsheet sebelumnya terlebih dahulu.' };
      }
    }

    return { canOpen: true, message: '' };
  }


  async getJobsheetFullByMataKuliah(jobsheetId, mataKuliahId, kelasPraktikumId = null, user = null, remedialId = null, attemptType = null) {
    const jobsheets = await this.getJobsheetsByMataKuliah(mataKuliahId, kelasPraktikumId, user);
    const jobsheet = jobsheets.find((item) => item.id === jobsheetId);
    if (!jobsheet) {
      if (user && user.role === 'MAHASISWA' && kelasPraktikumId) {
        const unpublished = await this._pool.query(
          `SELECT 1
           FROM jobsheet_classes jc
           JOIN jobsheets j ON j.id = jc.jobsheet_id
           WHERE jc.jobsheet_id = $1
             AND jc.id_kelas_praktikum = $2
             AND j.id_mata_kuliah = $3
           LIMIT 1`,
          [jobsheetId, kelasPraktikumId, mataKuliahId],
        );
        if (unpublished.rows.length) throw new ClientError('Jobsheet belum dipublish.', 403);
      }
      throw new NotFoundError('Jobsheet tidak tersedia untuk kelas Anda.');
    }
    if (user && user.role === 'MAHASISWA') {
      jobsheet.access = await this.getJobsheetAccess(
        user.id,
        jobsheetId,
        kelasPraktikumId || jobsheet.id_kelas_praktikum,
        remedialId,
        attemptType
      );
      if (!jobsheet.access.canEdit && jobsheet.access.accessMode === 'locked_sequence') {
        throw new ClientError(jobsheet.access.message || 'Selesaikan jobsheet sebelumnya terlebih dahulu.', 403);
      }
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
module.exports._private = {
  isCompletedSubmissionStatus,
};
