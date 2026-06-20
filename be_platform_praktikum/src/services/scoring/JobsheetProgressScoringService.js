const pool = require('../postgres');
const { ACADEMIC_TIMEZONE } = require('../postgres/student/DeadlineAccessService');

function round2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(Math.min(100, Math.max(0, number)).toFixed(2));
}

function normalizeWeight(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(Math.min(100, Math.max(0, number)).toFixed(2));
}

function extractTextFromTiptap(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextFromTiptap).join(' ');
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) return node.content.map(extractTextFromTiptap).join(' ');
  return '';
}

function extractInstructionSteps(content) {
  if (!content || !Array.isArray(content.content)) return [];
  const steps = [];

  for (const node of content.content) {
    if ((node.type === 'orderedList' || node.type === 'bulletList') && Array.isArray(node.content)) {
      for (const listItem of node.content) {
        const text = extractTextFromTiptap(listItem).trim();
        if (text) steps.push(text);
      }
      continue;
    }

    if (node.type === 'paragraph' || node.type === 'heading') {
      const text = extractTextFromTiptap(node).trim();
      if (text) steps.push(text);
    }
  }

  return steps;
}

function parseReport(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function hasMeaningfulCode(files = {}) {
  return Object.values(files || {}).some((code) => String(code || '').trim().length > 0);
}

function hasMeaningfulAnalysis(analysis) {
  return extractTextFromTiptap(analysis).trim().length > 0;
}

function isStepTouched(step = {}) {
  return (
    hasMeaningfulCode(step.files) ||
    String(step.output || '').trim().length > 0 ||
    hasMeaningfulAnalysis(step.analysis)
  );
}

function buildAttemptClause({ remedialId }, alias = '', startIndex = 4) {
  const prefix = alias ? `${alias}.` : '';
  if (remedialId) {
    return {
      clause: `AND ${prefix}remedial_id = $${startIndex}`,
      values: [remedialId],
    };
  }

  return {
    clause: `AND ${prefix}remedial_id IS NULL`,
    values: [],
  };
}

class JobsheetProgressScoringService {
  constructor() {
    this._pool = pool;
  }

  async _getCalculatedAt(client) {
    const result = await client.query(
      `SELECT to_char(NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}', 'YYYY-MM-DD HH24:MI:SS') AS calculated_at`,
    );
    return result.rows[0].calculated_at;
  }

  async _getJobsheetItems(client, jobsheetId) {
    const jobsheetResult = await client.query(
      'SELECT content FROM jobsheets WHERE id = $1 LIMIT 1',
      [jobsheetId],
    );
    const content = jobsheetResult.rows[0]?.content || {};
    const theoryItems = Array.isArray(content.theory) ? content.theory : [];

    const experimentsResult = await client.query(
      `SELECT id, title, instruction_content, template_code, rubric
       FROM experiments
       WHERE jobsheet_id = $1
       ORDER BY id ASC`,
      [jobsheetId],
    );

    const exercisesResult = await client.query(
      `SELECT id, title, instruction_content, template_code, rubric
       FROM exercises
       WHERE jobsheet_id = $1
       ORDER BY id ASC`,
      [jobsheetId],
    );

    return {
      theoryItems,
      experiments: experimentsResult.rows,
      exercises: exercisesResult.rows,
    };
  }

  async _getProgressContext(client, { studentId, jobsheetId, kelasPraktikumId, remedialId, reportOverride }) {
    const attempt = buildAttemptClause({ remedialId }, 'sp');
    const progressResult = await client.query(
      `SELECT completed_items
       FROM student_progress sp
       WHERE sp.student_id = $1
         AND sp.jobsheet_id = $2
         AND sp.id_kelas_praktikum = $3
         ${attempt.clause}
       ORDER BY sp.attempt_no DESC
       LIMIT 1`,
      [studentId, jobsheetId, kelasPraktikumId, ...attempt.values],
    );

    const logsAttempt = buildAttemptClause({ remedialId }, 'log', 3);
    const logsResult = await client.query(
      `SELECT activity_type, experiment_id, instruction_id
       FROM student_jobsheet_activity_logs log
       WHERE log.student_id = $1
         AND log.jobsheet_id = $2
         ${logsAttempt.clause}
       ORDER BY log.created_at DESC`,
      [studentId, jobsheetId, ...logsAttempt.values],
    );

    let report = reportOverride ? parseReport(reportOverride) : null;
    if (!report) {
      const submissionAttempt = buildAttemptClause({ remedialId }, 'ts');
      const submissionResult = await client.query(
        `SELECT report_html
         FROM task_submissions ts
         WHERE ts.student_id = $1
           AND ts.jobsheet_id = $2
           AND ts.id_kelas_praktikum = $3
           ${submissionAttempt.clause}
         ORDER BY ts.submitted_at DESC NULLS LAST, ts.id DESC
         LIMIT 1`,
        [studentId, jobsheetId, kelasPraktikumId, ...submissionAttempt.values],
      );
      report = parseReport(submissionResult.rows[0]?.report_html);
    }

    return {
      completedItems: Array.isArray(progressResult.rows[0]?.completed_items)
        ? progressResult.rows[0].completed_items
        : [],
      logs: logsResult.rows,
      report: report || {},
    };
  }

  _hasCompletedItem(completedItems, type, itemId) {
    return completedItems.some((item) => item?.type === type && item?.id === itemId);
  }

  _hasActivity(logs, activityTypes, matcher) {
    const types = Array.isArray(activityTypes) ? activityTypes : [activityTypes];
    return logs.some((log) => types.includes(log.activity_type) && matcher(log));
  }

  _scoreTheory(item, index, context) {
    const itemId = item.id || `theory-${index}`;
    const weight = normalizeWeight(item.rubric);
    const completed =
      this._hasCompletedItem(context.completedItems, 'theory', itemId) ||
      this._hasActivity(
        context.logs,
        ['open_instruction', 'complete_instruction'],
        (log) => log.instruction_id === itemId,
      );

    const completionRatio = completed ? 1 : 0;
    return {
      type: 'theory',
      itemId,
      title: item.title || `Dasar Teori ${index + 1}`,
      weight,
      completionRatio,
      earnedScore: round2(weight * completionRatio),
    };
  }

  _scoreExperiment(item, index, context) {
    const weight = normalizeWeight(item.rubric);
    const itemId = item.id;

    if (
      this._hasCompletedItem(context.completedItems, 'experiment', itemId) ||
      this._hasActivity(context.logs, 'complete_experiment', (log) => log.experiment_id === itemId)
    ) {
      return {
        type: 'experiment',
        itemId,
        title: item.title || `Percobaan ${index + 1}`,
        weight,
        completionRatio: 1,
        earnedScore: weight,
      };
    }

    const steps = extractInstructionSteps(item.instruction_content);
    const totalSteps = Math.max(steps.length, 1);
    const reportSteps = context.report?.experiments?.[itemId]?.steps || [];
    const completedSteps = Math.min(
      totalSteps,
      reportSteps.filter((step) => isStepTouched(step)).length,
    );
    const completionRatio = totalSteps > 0 ? completedSteps / totalSteps : 0;

    return {
      type: 'experiment',
      itemId,
      title: item.title || `Percobaan ${index + 1}`,
      weight,
      completionRatio: round2(completionRatio),
      earnedScore: round2(weight * completionRatio),
      completedSteps,
      totalSteps,
    };
  }

  _scoreExercise(item, index, context) {
    const weight = normalizeWeight(item.rubric);
    const itemId = item.id;
    const report = context.report?.exercises?.[itemId] || {};
    const completed =
      this._hasCompletedItem(context.completedItems, 'exercise', itemId) ||
      this._hasActivity(
        context.logs,
        ['complete_instruction', 'submit_answer'],
        (log) => log.instruction_id === itemId,
      ) ||
      isStepTouched(report);

    const completionRatio = completed ? 1 : 0;
    return {
      type: 'exercise',
      itemId,
      title: item.title || `Latihan ${index + 1}`,
      weight,
      completionRatio,
      earnedScore: round2(weight * completionRatio),
    };
  }

  async calculate({
    studentId,
    jobsheetId,
    kelasPraktikumId,
    idKelasMhs = null,
    attemptType = 'normal',
    attemptNo = 1,
    remedialId = null,
    report = null,
    client = this._pool,
  }) {
    const items = await this._getJobsheetItems(client, jobsheetId);
    const context = await this._getProgressContext(client, {
      studentId,
      jobsheetId,
      kelasPraktikumId,
      remedialId,
      reportOverride: report,
    });
    const calculatedAt = await this._getCalculatedAt(client);

    const scoredItems = [
      ...items.theoryItems.map((item, index) => this._scoreTheory(item, index, context)),
      ...items.experiments.map((item, index) => this._scoreExperiment(item, index, context)),
      ...items.exercises.map((item, index) => this._scoreExercise(item, index, context)),
    ];

    const totalWeight = round2(scoredItems.reduce((total, item) => total + item.weight, 0));
    const completedWeight = round2(scoredItems.reduce((total, item) => total + item.earnedScore, 0));

    return {
      progressScore: completedWeight,
      totalWeight,
      completedWeight,
      calculatedAt,
      studentId,
      jobsheetId,
      kelasPraktikumId,
      idKelasMhs,
      attemptType,
      attemptNo,
      remedialId,
      items: scoredItems,
    };
  }

  async calculateForSubmission(submissionId, client = this._pool) {
    const result = await client.query(
      `SELECT
         id,
         student_id,
         jobsheet_id,
         id_kelas_praktikum,
         id_kelas_mhs,
         attempt_type,
         attempt_no,
         remedial_id,
         report_html
       FROM task_submissions
       WHERE id = $1
       LIMIT 1`,
      [submissionId],
    );

    if (!result.rows.length) {
      throw new Error('Submission tidak ditemukan');
    }

    const submission = result.rows[0];
    return this.calculate({
      studentId: submission.student_id,
      jobsheetId: submission.jobsheet_id,
      kelasPraktikumId: submission.id_kelas_praktikum,
      idKelasMhs: submission.id_kelas_mhs,
      attemptType: submission.attempt_type,
      attemptNo: submission.attempt_no,
      remedialId: submission.remedial_id,
      report: parseReport(submission.report_html),
      client,
    });
  }
}

module.exports = new JobsheetProgressScoringService();
