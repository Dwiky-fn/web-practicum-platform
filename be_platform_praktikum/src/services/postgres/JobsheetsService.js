const pool = require('./index');

const emptyDoc = { type: 'doc', content: [] };

class JobsheetsService {
  constructor() {
    this._pool = pool;
  }

  _mapJobsheet(row, experiments = [], exercises = []) {
    const content = row.content || {};

    return {
      ...row,
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
      programming_language: 'java',
      programming_language_display_name: 'Java',
      programming_language_file_extension: 'java',
    };
  }

  async getJobsheetsByCourse(courseId) {
    const jobsheetsRes = await this._pool.query(
      `SELECT
        j.id,
        j.course_id,
        j.title,
        j.description,
        j.goal,
        j.content,
        j.status,
        MIN(jc.deadline) AS deadline
      FROM jobsheets j
      LEFT JOIN jobsheet_classes jc ON jc.jobsheet_id = j.id
      WHERE j.course_id = $1
      GROUP BY j.id
      ORDER BY MIN(jc.deadline) ASC NULLS LAST, j.id ASC`,
      [courseId],
    );

    const jobsheetIds = jobsheetsRes.rows.map((jobsheet) => jobsheet.id);

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
        template_code AS default_template_code
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
        template_code AS default_template_code
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

    return jobsheetsRes.rows.map((jobsheet) => this._mapJobsheet(
      jobsheet,
      experimentsByJobsheet.get(jobsheet.id) || [],
      exercisesByJobsheet.get(jobsheet.id) || [],
    ));
  }

  async getJobsheetFullById(jobsheetId, courseId) {
    const jobsheetRes = await this._pool.query(
      `SELECT
        j.id,
        j.course_id,
        j.title,
        j.description,
        j.goal,
        j.content,
        j.status,
        MIN(jc.deadline) AS deadline
      FROM jobsheets j
      LEFT JOIN jobsheet_classes jc ON jc.jobsheet_id = j.id
      WHERE j.id = $1 AND j.course_id = $2
      GROUP BY j.id`,
      [jobsheetId, courseId],
    );

    if (!jobsheetRes.rows.length) {
      throw new Error('Jobsheet tidak ditemukan');
    }

    const experimentsRes = await this._pool.query(
      `SELECT
        id,
        title,
        instruction_content,
        template_code,
        template_code AS default_template_code
      FROM experiments
      WHERE jobsheet_id = $1
      ORDER BY id ASC`,
      [jobsheetId],
    );

    const exercisesRes = await this._pool.query(
      `SELECT
        id,
        title,
        instruction_content,
        template_code,
        template_code AS default_template_code
      FROM exercises
      WHERE jobsheet_id = $1
      ORDER BY id ASC`,
      [jobsheetId],
    );

    return this._mapJobsheet(
      jobsheetRes.rows[0],
      experimentsRes.rows,
      exercisesRes.rows,
    );
  }
}

module.exports = JobsheetsService;
