const {
  buildEvaluationPrompt,
  buildRepairPrompt,
} = require('./promptBuilderService');
const { generateJsonText } = require('./ollamaService');
const {
  createExperimentChunks,
} = require('./contextChunkService');
const {
  validateEvaluationResult,
} = require('../schemas/evaluationResultSchema');
const { parseJsonResponse } = require('../utils/jsonParser');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

async function evaluateSubmission(payload) {
  const startedAt = Date.now();

  logger.info('Evaluation started', {
    requestId: payload.requestId,
    submissionId: payload.submissionId,
    experimentId: payload.experiment?.id || null,
    scope: payload.scope,
    fileCount: payload.experiment?.files?.length || 0,
  });

  let result;

  if (payload.scope === 'experiment') {
    result = await evaluateExperiment(payload);
  } else if (payload.scope === 'exercise') {
    result = await evaluateExercise(payload);
  } else if (payload.scope === 'jobsheet') {
    result = await evaluateJobsheetFull(payload);
  } else {
    throw new AppError('Scope evaluasi tidak didukung', {
      statusCode: 400,
      code: 'INVALID_SCOPE',
    });
  }

  logger.info('Evaluation completed', {
    requestId: payload.requestId,
    submissionId: payload.submissionId,
    experimentId: payload.experiment?.id || null,
    scope: payload.scope,
    durationMs: Date.now() - startedAt,
    feedbackCount: result.codeFeedbacks?.length || result.experimentEvaluations?.length || 0,
  });

  return result;
}

async function evaluateJobsheetFull(payload) {
  const experimentEvaluations = [];
  const exerciseEvaluations = [];
  let successfulResultsCount = 0;
  let overallSuccess = true;

  for (const exp of payload.experiments) {
    try {
      const expPayload = {
        scope: 'experiment',
        submissionId: payload.submissionId,
        jobsheet: payload.jobsheet,
        experiment: exp,
        rubric: exp.rubric || payload.rubric || { criteria: [] },
        options: payload.options,
      };

      console.log(`[AI Service] Memulai evaluasi serial untuk percobaan: ${exp.id}`);
      const expResult = await evaluateExperiment(expPayload);
      
      experimentEvaluations.push({
        experimentId: exp.id,
        status: 'completed',
        codeFeedbacks: expResult.codeFeedbacks || [],
        feedback: expResult.experimentFeedback,
        rubricScores: expResult.rubricScores || [],
        totalScoreRecommendation: expResult.totalScoreRecommendation || 0
      });
      successfulResultsCount += 1;
    } catch (err) {
      console.error(`[AI Service] Gagal mengevaluasi percobaan ${exp.id}:`, err);
      overallSuccess = false;
      experimentEvaluations.push({
        experimentId: exp.id,
        status: 'failed',
        error: err.message || 'Gagal mengevaluasi percobaan'
      });
    }
  }

  const payloadExercises = payload.exercises || [];
  for (const exe of payloadExercises) {
    try {
      const exePayload = {
        scope: 'exercise',
        submissionId: payload.submissionId,
        jobsheet: payload.jobsheet,
        exercise: exe,
        rubric: exe.rubric || payload.rubric || { criteria: [] },
        options: payload.options,
      };

      console.log(`[AI Service] Memulai evaluasi serial untuk latihan: ${exe.id}`);
      const exeResult = await evaluateExercise(exePayload);

      exerciseEvaluations.push({
        exerciseId: exe.id,
        status: 'completed',
        codeFeedbacks: exeResult.codeFeedbacks || [],
        feedback: exeResult.exerciseFeedback,
        rubricScores: exeResult.rubricScores || [],
        totalScoreRecommendation: exeResult.totalScoreRecommendation || 0
      });
      successfulResultsCount += 1;
    } catch (err) {
      console.error(`[AI Service] Gagal mengevaluasi latihan ${exe.id}:`, err);
      overallSuccess = false;
      exerciseEvaluations.push({
        exerciseId: exe.id,
        status: 'failed',
        error: err.message || 'Gagal mengevaluasi latihan'
      });
    }
  }

  if (successfulResultsCount === 0) {
    throw new AppError('Seluruh percobaan dan latihan pada jobsheet gagal dievaluasi', {
      statusCode: 502,
      code: 'JOBSHEET_EVALUATION_FAILED',
      details: [
        ...experimentEvaluations.map(e => ({ experimentId: e.experimentId, error: e.error })),
        ...exerciseEvaluations.map(e => ({ exerciseId: e.exerciseId, error: e.error }))
      ]
    });
  }

  // Siapkan experimentResults ringkasan dari percobaan yang sukses untuk prompting jobsheet
  const successfulExperimentResults = experimentEvaluations
    .filter(item => item.status === 'completed')
    .map(item => ({
      experimentId: item.experimentId,
      title: payload.experiments.find(e => e.id === item.experimentId)?.title || 'Percobaan',
      summary: item.feedback.summary || '',
      strengths: item.feedback.strengths || [],
      issues: item.feedback.issues || [],
      suggestions: item.feedback.suggestions || [],
      rubricScores: item.rubricScores
    }));

  const successfulExerciseResults = exerciseEvaluations
    .filter(item => item.status === 'completed')
    .map(item => ({
      exerciseId: item.exerciseId,
      title: payloadExercises.find(e => e.id === item.exerciseId)?.title || 'Latihan',
      summary: item.feedback.summary || '',
      strengths: item.feedback.strengths || [],
      issues: item.feedback.issues || [],
      suggestions: item.feedback.suggestions || [],
      rubricScores: item.rubricScores
    }));

  // Panggil model untuk menghasilkan feedback keseluruhan jobsheet
  const jobsheetSummaryPayload = {
    scope: 'jobsheet',
    submissionId: payload.submissionId,
    jobsheet: payload.jobsheet,
    experimentResults: successfulExperimentResults,
    exerciseResults: successfulExerciseResults,
    studentConclusion: payload.studentConclusion,
    rubric: payload.rubric,
    options: payload.options,
    requestId: payload.requestId
  };

  console.log(`[AI Service] Memulai evaluasi scope jobsheet keseluruhan`);
  const jobsheetModelResult = await requestValidModelResult(jobsheetSummaryPayload);

  const finalResponse = {
    scope: 'jobsheet',
    submissionId: payload.submissionId,
    jobsheetId: payload.jobsheet.id,
    evaluationStatus: overallSuccess ? 'completed' : 'partially_failed',
    experimentEvaluations,
    exerciseEvaluations,
    jobsheetFeedback: jobsheetModelResult.jobsheetFeedback,
    rubricScores: jobsheetModelResult.rubricScores || [],
    totalScoreRecommendation: jobsheetModelResult.totalScoreRecommendation || 0,
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true
  };

  return finalResponse;
}


async function evaluateExperiment(payload) {
  const chunks = createExperimentChunks(payload);

  if (chunks.length > 100) {
    throw new AppError('Source code terlalu besar untuk diproses', {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  const results = [];

  for (const chunk of chunks) {
    // Sengaja berurutan agar sesuai keterbatasan resource lokal.
    const result = await requestValidModelResult(chunk);
    results.push(result);
  }

  if (results.length === 1) {
    return sanitizeExperimentResult(results[0], payload);
  }

  const merged = mergeExperimentResults(results, payload);
  return sanitizeExperimentResult(merged, payload);
}

async function requestValidModelResult(payload) {
  const configuredRetries = Number(process.env.AI_MAX_RETRIES);
  const maxRetries = Number.isInteger(configuredRetries)
    ? configuredRetries
    : 2;
  let prompt = buildEvaluationPrompt(payload);
  let lastOutput = '';
  let lastErrors = [];

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    console.log(`[AI Service] Mengirim request ke model (Attempt ${attempt + 1}/${maxRetries + 1}) untuk scope: ${payload.scope}...`);
    lastOutput = await generateJsonText({
      ...prompt,
      requestId: payload.requestId,
    });

    const validation = parseAndValidate(lastOutput, payload);

    if (validation.valid) {
      console.log(`[AI Service] Output model valid pada Attempt ${attempt + 1} untuk scope: ${payload.scope}`);
      return validation.value;
    }

    lastErrors = validation.errors;

    console.warn(`[AI Service] [Attempt ${attempt + 1}] Validasi output model gagal untuk scope ${payload.scope}. Errors:`, JSON.stringify(lastErrors, null, 2));

    logger.warn('Model output validation failed', {
      requestId: payload.requestId,
      submissionId: payload.submissionId,
      scope: payload.scope,
      attempt: attempt + 1,
      errorCount: lastErrors.length,
    });

    if (attempt < maxRetries) {
      prompt = buildRepairPrompt({
        invalidOutput: lastOutput,
        validationErrors: lastErrors,
        scope: payload.scope,
      });
    }
  }

  console.error(`[AI Service] Seluruh attempt retry habis. Model gagal mengembalikan response sesuai skema.`);
  throw new AppError('Output AI tidak sesuai format setelah retry', {
    statusCode: 502,
    code: 'INVALID_MODEL_RESPONSE',
    details: lastErrors,
  });
}

function parseAndValidate(rawOutput, payload) {
  let parsed;

  try {
    parsed = parseJsonResponse(rawOutput);
  } catch (error) {
    console.error(`[AI Service] Gagal mem-parse JSON dari model (Error: ${error.message}). Output mentah:`, rawOutput);
    return {
      valid: false,
      errors: [
        {
          path: '',
          type: 'json.parse',
          message: error.message,
        },
      ],
    };
  }

  const { error, value } = validateEvaluationResult(parsed);

  if (error) {
    console.error(`[AI Service] Validasi Joi gagal untuk scope ${payload.scope}. Errors:`, error.details);
    return {
      valid: false,
      errors: mapJoiErrors(error),
    };
  }

  const domainErrors = validateResultAgainstPayload(value, payload);

  if (domainErrors.length > 0) {
    console.error(`[AI Service] Validasi Domain gagal untuk scope ${payload.scope}. Errors:`, domainErrors);
    return {
      valid: false,
      errors: domainErrors,
    };
  }

  return {
    valid: true,
    value,
  };
}

function validateResultAgainstPayload(result, payload) {
  const errors = [];

  if (result.scope !== payload.scope) {
    errors.push(domainError('scope', 'Scope response tidak sesuai request'));
  }

  if (result.submissionId !== payload.submissionId) {
    errors.push(
      domainError('submissionId', 'submissionId response tidak sesuai request'),
    );
  }

  if (
    payload.scope === 'experiment'
    && result.experimentId !== payload.experiment.id
  ) {
    errors.push(
      domainError('experimentId', 'experimentId response tidak sesuai request'),
    );
  }

  if (
    payload.scope === 'exercise'
    && result.exerciseId !== payload.exercise.id
  ) {
    errors.push(
      domainError('exerciseId', 'exerciseId response tidak sesuai request'),
    );
  }

  if (
    payload.scope === 'jobsheet'
    && result.jobsheetId !== payload.jobsheet.id
  ) {
    errors.push(
      domainError('jobsheetId', 'jobsheetId response tidak sesuai request'),
    );
  }

  if (payload.scope === 'experiment' || payload.scope === 'exercise') {
    const targetKey = payload.scope === 'experiment' ? 'experiment' : 'exercise';
    const files = new Map(
      payload[targetKey].files.map((file) => [file.id, file]),
    );

    result.codeFeedbacks.forEach((feedback, index) => {
      const file = files.get(feedback.fileId);

      if (!file || file.path !== feedback.filePath) {
        errors.push(
          domainError(
            `codeFeedbacks.${index}.fileId`,
            'Code feedback merujuk ke file yang tidak tersedia',
          ),
        );
        return;
      }

      const lineOffset = Number(file._lineOffset) || 0;
      const lineCount = String(file.content).split(/\r?\n/).length;
      const firstLine = lineOffset + 1;
      const lastLine = lineOffset + lineCount;

      if (
        feedback.startLine < firstLine
        || feedback.endLine > lastLine
      ) {
        errors.push(
          domainError(
            `codeFeedbacks.${index}.startLine`,
            'Nomor baris berada di luar rentang file yang dievaluasi',
          ),
        );
      }
    });
  }

  const criteria = new Map(
    payload.rubric.criteria.map((item) => [item.id, item]),
  );
  const usedCriterionIds = new Set();

  result.rubricScores.forEach((score, index) => {
    const criterion = criteria.get(score.criterionId);

    if (!criterion) {
      errors.push(
        domainError(
          `rubricScores.${index}.criterionId`,
          'criterionId tidak tersedia pada rubrik',
        ),
      );
      return;
    }

    if (usedCriterionIds.has(score.criterionId)) {
      errors.push(
        domainError(
          `rubricScores.${index}.criterionId`,
          'criterionId digunakan lebih dari satu kali',
        ),
      );
    }
    usedCriterionIds.add(score.criterionId);

    if (Math.abs(score.maxScore - criterion.maxScore) > 0.0001) {
      errors.push(
        domainError(
          `rubricScores.${index}.maxScore`,
          'maxScore tidak sesuai dengan rubrik',
        ),
      );
    }
  });

  if (payload.options?.includeScoreRecommendation !== false) {
    criteria.forEach((criterion) => {
      if (!usedCriterionIds.has(criterion.id)) {
        errors.push(
          domainError(
            'rubricScores',
            `Rekomendasi nilai untuk criterionId "${criterion.id}" belum tersedia`,
          ),
        );
      }
    });
  }

  if (payload.scope === 'jobsheet') {
    const validExperimentIds = new Set(
      payload.experimentResults.map((item) => item.experimentId),
    );

    result.jobsheetFeedback.experimentsNeedingAttention.forEach(
      (item, index) => {
        if (!validExperimentIds.has(item.experimentId)) {
          errors.push(
            domainError(
              `jobsheetFeedback.experimentsNeedingAttention.${index}.experimentId`,
              'experimentId tidak tersedia pada experimentResults',
            ),
          );
        }
      },
    );

    if (result.jobsheetFeedback.exercisesNeedingAttention) {
      const validExerciseIds = new Set(
        (payload.exerciseResults || []).map((item) => item.exerciseId),
      );

      result.jobsheetFeedback.exercisesNeedingAttention.forEach(
        (item, index) => {
          if (!validExerciseIds.has(item.exerciseId)) {
            errors.push(
              domainError(
                `jobsheetFeedback.exercisesNeedingAttention.${index}.exerciseId`,
                'exerciseId tidak tersedia pada exerciseResults',
              ),
            );
          }
        },
      );
    }
  }

  return errors;
}

function sanitizeEvaluationResult(result, originalPayload) {
  let targetKey = 'experiment';
  if (originalPayload.scope === 'exercise') {
    targetKey = 'exercise';
  } else if (originalPayload.scope === 'experiment') {
    targetKey = 'experiment';
  } else if (originalPayload.exercise && !originalPayload.experiment) {
    targetKey = 'exercise';
  }
  const idKey = targetKey === 'experiment' ? 'experimentId' : 'exerciseId';
  
  const validFeedbacks = [];
  const targetObj = originalPayload[targetKey];
  const filesById = new Map(
    targetObj.files.map((file) => [file.id, file]),
  );

  result.codeFeedbacks.forEach((feedback) => {
    const file = filesById.get(feedback.fileId);
    const lineCount = file ? String(file.content).split(/\r?\n/).length : 0;
    const samePath = file && file.path === feedback.filePath;
    const validRange =
      feedback.startLine >= 1
      && feedback.endLine >= feedback.startLine
      && feedback.endLine <= lineCount;

    if (!file || !samePath || !validRange) {
      logger.warn('Invalid code feedback discarded', {
        requestId: originalPayload.requestId,
        submissionId: originalPayload.submissionId,
        [idKey]: targetObj.id,
        fileId: feedback.fileId,
        startLine: feedback.startLine,
        endLine: feedback.endLine,
      });
      return;
    }

    const expectedSelectedCode = String(file.content)
      .split(/\r?\n/)
      .slice(feedback.startLine - 1, feedback.endLine)
      .join('\n');

    if (
      feedback.selectedCode
      && normalizeNewlines(feedback.selectedCode).trim()
        !== normalizeNewlines(expectedSelectedCode).trim()
    ) {
      logger.warn('Code feedback selectedCode mismatch discarded', {
        requestId: originalPayload.requestId,
        submissionId: originalPayload.submissionId,
        [idKey]: targetObj.id,
        fileId: feedback.fileId,
      });
      return;
    }

    validFeedbacks.push({
      ...feedback,
      selectedCode: expectedSelectedCode,
    });
  });

  return {
    ...result,
    codeFeedbacks: deduplicateCodeFeedbacks(validFeedbacks),
  };
}

function sanitizeExperimentResult(result, originalPayload) {
  return sanitizeEvaluationResult(result, originalPayload);
}

function sanitizeExerciseResult(result, originalPayload) {
  return sanitizeEvaluationResult(result, originalPayload);
}

async function evaluateExercise(payload) {
  const chunks = createExperimentChunks(payload);

  if (chunks.length > 100) {
    throw new AppError('Source code terlalu besar untuk diproses', {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  const results = [];

  for (const chunk of chunks) {
    const result = await requestValidModelResult(chunk);
    results.push(result);
  }

  if (results.length === 1) {
    return sanitizeExerciseResult(results[0], payload);
  }

  const merged = mergeExerciseResults(results, payload);
  return sanitizeExerciseResult(merged, payload);
}

function mergeExerciseResults(results, payload) {
  const feedbackKeys = [
    'summary',
    'instructionCompliance',
    'codeEvaluation',
    'outputEvaluation',
    'testCaseEvaluation',
    'errorEvaluation',
    'analysisEvaluation',
  ];

  const exerciseFeedback = {};

  feedbackKeys.forEach((key) => {
    exerciseFeedback[key] = uniqueStrings(
      results.map((item) => item.exerciseFeedback[key]),
    ).join('\n\n');
  });

  exerciseFeedback.strengths = uniqueStrings(
    results.flatMap((item) => item.exerciseFeedback.strengths),
  );
  exerciseFeedback.issues = uniqueStrings(
    results.flatMap((item) => item.exerciseFeedback.issues),
  );
  exerciseFeedback.suggestions = uniqueStrings(
    results.flatMap((item) => item.exerciseFeedback.suggestions),
  );

  const rubricScores = payload.options?.includeScoreRecommendation === false
    ? []
    : payload.rubric.criteria.map((criterion) => {
        const matches = results
          .flatMap((item) => item.rubricScores)
          .filter((item) => item.criterionId === criterion.id);

        if (matches.length === 0) {
          return {
            criterionId: criterion.id,
            score: 0,
            maxScore: criterion.maxScore,
            reason: 'Model tidak memberikan rekomendasi pada chunk ini.',
          };
        }

        const averageScore = matches.reduce(
          (total, item) => total + item.score,
          0,
        ) / matches.length;

        return {
          criterionId: criterion.id,
          score: Math.min(
            criterion.maxScore,
            Number(averageScore.toFixed(2)),
          ),
          maxScore: criterion.maxScore,
          reason: uniqueStrings(matches.map((item) => item.reason)).join(' '),
        };
      });

  return {
    scope: 'exercise',
    submissionId: payload.submissionId,
    exerciseId: payload.exercise.id,
    codeFeedbacks: results.flatMap((item) => item.codeFeedbacks),
    exerciseFeedback,
    rubricScores,
    totalScoreRecommendation: rubricScores.reduce(
      (total, item) => total + item.score,
      0,
    ),
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true,
  };
}

function mergeExperimentResults(results, payload) {
  const feedbackKeys = [
    'summary',
    'instructionCompliance',
    'codeEvaluation',
    'outputEvaluation',
    'testCaseEvaluation',
    'errorEvaluation',
    'analysisEvaluation',
  ];

  const experimentFeedback = {};

  feedbackKeys.forEach((key) => {
    experimentFeedback[key] = uniqueStrings(
      results.map((item) => item.experimentFeedback[key]),
    ).join('\n\n');
  });

  experimentFeedback.strengths = uniqueStrings(
    results.flatMap((item) => item.experimentFeedback.strengths),
  );
  experimentFeedback.issues = uniqueStrings(
    results.flatMap((item) => item.experimentFeedback.issues),
  );
  experimentFeedback.suggestions = uniqueStrings(
    results.flatMap((item) => item.experimentFeedback.suggestions),
  );

  const rubricScores = payload.options?.includeScoreRecommendation === false
    ? []
    : payload.rubric.criteria.map((criterion) => {
        const matches = results
          .flatMap((item) => item.rubricScores)
          .filter((item) => item.criterionId === criterion.id);

        if (matches.length === 0) {
          return {
            criterionId: criterion.id,
            score: 0,
            maxScore: criterion.maxScore,
            reason: 'Model tidak memberikan rekomendasi pada chunk ini.',
          };
        }

        const averageScore = matches.reduce(
          (total, item) => total + item.score,
          0,
        ) / matches.length;

        return {
          criterionId: criterion.id,
          score: Math.min(
            criterion.maxScore,
            Number(averageScore.toFixed(2)),
          ),
          maxScore: criterion.maxScore,
          reason: uniqueStrings(matches.map((item) => item.reason)).join(' '),
        };
      });

  return {
    scope: 'experiment',
    submissionId: payload.submissionId,
    experimentId: payload.experiment.id,
    codeFeedbacks: results.flatMap((item) => item.codeFeedbacks),
    experimentFeedback,
    rubricScores,
    totalScoreRecommendation: rubricScores.reduce(
      (total, item) => total + item.score,
      0,
    ),
    source: 'ai',
    status: 'draft',
    requiresLecturerReview: true,
  };
}

function deduplicateCodeFeedbacks(feedbacks) {
  const seen = new Set();

  return feedbacks.filter((item) => {
    const key = [
      item.fileId,
      item.startLine,
      item.endLine,
      item.category,
      item.message.trim().toLowerCase(),
    ].join(':');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const normalized = String(value || '').trim();
    const key = normalized.toLowerCase();

    if (normalized && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  });

  return result;
}

function mapJoiErrors(error) {
  const errors = [];

  function collect(detail) {
    if (detail.context && Array.isArray(detail.context.details)) {
      detail.context.details.forEach(collect);
    } else {
      errors.push({
        path: Array.isArray(detail.path) ? detail.path.join('.') : '',
        type: detail.type,
        message: detail.message.replace(/"/g, ''),
      });
    }
  }

  error.details.forEach(collect);
  return errors;
}

function domainError(path, message) {
  return {
    path,
    type: 'domain.validation',
    message,
  };
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n');
}

module.exports = {
  evaluateSubmission,
  evaluateExercise,
  parseAndValidate,
  validateResultAgainstPayload,
  sanitizeExperimentResult,
  sanitizeExerciseResult,
  mergeExperimentResults,
  mergeExerciseResults,
  deduplicateCodeFeedbacks,
};
