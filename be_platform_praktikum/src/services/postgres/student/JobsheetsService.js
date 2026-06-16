const pool = require('..');

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
          jc.deadline
        FROM jobsheets j
        JOIN jobsheet_classes jc
          ON jc.jobsheet_id = j.id
         AND jc.is_active = true
         AND jc.status = 'PUBLISHED'
        JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
        JOIN kelas_mhs km
          ON km.id_tahun_semester = kp.id_tahun_semester
         AND km.id_semester = kp.id_semester
         AND km.id_kelas = kp.id_kelas
         AND km.id_mahasiswa = $2
         AND km.status = 'active'
        WHERE j.id_mata_kuliah = $1
          AND kp.id_mata_kuliah = $1
          AND j.status = 'PUBLISHED'
          ${kelasFilter}
        ORDER BY jc.deadline ASC NULLS LAST, j.id ASC
        `,
        params,
      );

      return this._hydrateJobsheets(result.rows);
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
        MIN(jc.deadline) AS deadline
      FROM jobsheets j
      LEFT JOIN jobsheet_classes jc ON jc.jobsheet_id = j.id AND jc.is_active = true
      WHERE j.id_mata_kuliah = $1
      GROUP BY j.id
      ORDER BY MIN(jc.deadline) ASC NULLS LAST, j.id ASC
      `,
      [mataKuliahId],
    );

    return this._hydrateJobsheets(result.rows);
  }

  async getJobsheetFullByMataKuliah(jobsheetId, mataKuliahId, kelasPraktikumId = null, user = null) {
    const jobsheets = await this.getJobsheetsByMataKuliah(mataKuliahId, kelasPraktikumId, user);
    const jobsheet = jobsheets.find((item) => item.id === jobsheetId);
    if (!jobsheet) {
      throw new Error('Jobsheet tidak tersedia untuk kelas Anda.');
    }
    return jobsheet;
  }
}

module.exports = JobsheetsService;
