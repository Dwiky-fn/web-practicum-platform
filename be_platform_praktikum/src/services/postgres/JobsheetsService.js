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
      judge0_language_id: 62,
      programming_language_file_extension: 'java',
    };
  }

  async getJobsheetsByCourse(courseId) {
    const result = await this._pool.query(
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

    return result.rows.map((jobsheet) => this._mapJobsheet(jobsheet));
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
