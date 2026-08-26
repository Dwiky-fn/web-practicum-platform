const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { buildEvaluationPrompt, buildRepairPrompt } = require('../promptBuilderService');
const { generateJsonText } = require('../aiProvider');
const { createExperimentChunks } = require('../contextChunkService');
const { parseAndValidate, sanitizeEvaluationResult } = require('./validation');
const { mergeExerciseResults, mergeExperimentResults } = require('./mergeResults');
const { addSectionMetadataToCodeFeedbacks, uniqueStrings } = require('./resultUtils');
const { calculateScoreSummary } = require('./scoreSummary');
async function evaluateSubmission(payload) {
  const startedAt = Date.now();
  logger.info('Evaluation started', { requestId: payload.requestId, submissionId: payload.submissionId, experimentId: payload.experiment?.id || null, scope: payload.scope, fileCount: payload.experiment?.files?.length || 0 });
  let result;
  if (payload.scope === 'experiment') result = await evaluateExperiment(payload);
  else if (payload.scope === 'exercise') result = await evaluateExercise(payload);
  else if (payload.scope === 'jobsheet') result = await evaluateJobsheetFull(payload);
  else throw new AppError('Scope evaluasi tidak didukung', { statusCode: 400, code: 'INVALID_SCOPE' });
  logger.info('Evaluation completed', { requestId: payload.requestId, submissionId: payload.submissionId, experimentId: payload.experiment?.id || null, scope: payload.scope, durationMs: Date.now() - startedAt, sectionFeedbackCount: countSectionFeedbacks(result), commentCount: countComments(result), codeFeedbackCount: countCodeFeedbacks(result), rubricScoreCount: result.rubricScores?.length || 0, totalScoreRecommendation: result.totalScoreRecommendation || 0, totalMaxScore: result.totalMaxScore || 0, finalGradeRecommendation: result.finalGradeRecommendation || 0 });
  return result;
}
async function evaluateJobsheetFull(payload) {
  const experimentEvaluations = [];
  const exerciseEvaluations = [];
  let successfulResultsCount = 0;
  let overallSuccess = true;
  for (const exp of payload.experiments) {
    try {
      const expResult = await evaluateExperiment({ scope: 'experiment', submissionId: payload.submissionId, jobsheet: payload.jobsheet, experiment: exp, rubric: exp.rubric || payload.rubric || { criteria: [] }, options: payload.options });
      experimentEvaluations.push({ experimentId: exp.experimentId || exp.id, step: exp.step || null, status: 'completed', codeFeedbacks: addSectionMetadataToCodeFeedbacks(expResult.codeFeedbacks || [], exp.experimentId || exp.id, exp.step || null), feedback: expResult.experimentFeedback, rubricScores: expResult.rubricScores || [], totalScoreRecommendation: expResult.totalScoreRecommendation || 0, totalMaxScore: expResult.totalMaxScore || 0, finalGradeRecommendation: expResult.finalGradeRecommendation || 0 });
      successfulResultsCount += 1;
    } catch (err) {
      overallSuccess = false;
      experimentEvaluations.push({ experimentId: exp.experimentId || exp.id, step: exp.step || null, status: 'failed', error: err.message || 'Gagal mengevaluasi percobaan' });
    }
  }
  const payloadExercises = payload.exercises || [];
  for (const exe of payloadExercises) {
    try {
      const exeResult = await evaluateExercise({ scope: 'exercise', submissionId: payload.submissionId, jobsheet: payload.jobsheet, exercise: exe, rubric: exe.rubric || payload.rubric || { criteria: [] }, options: payload.options });
      exerciseEvaluations.push({ exerciseId: exe.id, status: 'completed', codeFeedbacks: exeResult.codeFeedbacks || [], feedback: exeResult.exerciseFeedback, rubricScores: exeResult.rubricScores || [], totalScoreRecommendation: exeResult.totalScoreRecommendation || 0 });
      successfulResultsCount += 1;
    } catch (err) {
      overallSuccess = false;
      exerciseEvaluations.push({ exerciseId: exe.id, status: 'failed', error: err.message || 'Gagal mengevaluasi latihan' });
    }
  }
  if (successfulResultsCount === 0) throw new AppError('Seluruh percobaan dan latihan pada jobsheet gagal dievaluasi', { statusCode: 502, code: 'JOBSHEET_EVALUATION_FAILED', details: [...experimentEvaluations.map((e) => ({ experimentId: e.experimentId, error: e.error })), ...exerciseEvaluations.map((e) => ({ exerciseId: e.exerciseId, error: e.error }))] });
  const successfulExperimentResults = experimentEvaluations.filter((item) => item.status === 'completed').map((item) => ({ experimentId: item.experimentId, title: payload.experiments.find((e) => (e.experimentId || e.id) === item.experimentId && (e.step || null) === (item.step || null))?.title || 'Percobaan', summary: item.feedback.summary || '', strengths: item.feedback.strengths || [], issues: item.feedback.issues || [], suggestions: item.feedback.suggestions || [], rubricScores: item.rubricScores }));
  const successfulExerciseResults = exerciseEvaluations.filter((item) => item.status === 'completed').map((item) => ({ exerciseId: item.exerciseId, title: payloadExercises.find((e) => e.id === item.exerciseId)?.title || 'Latihan', summary: item.feedback.summary || '', strengths: item.feedback.strengths || [], issues: item.feedback.issues || [], suggestions: item.feedback.suggestions || [], rubricScores: item.rubricScores }));
  if (process.env.AI_REVIEW_MODE === 'fast') return buildJobsheetSummaryFromSectionResults({ submissionId: payload.submissionId, jobsheetId: payload.jobsheet.id, experimentEvaluations, exerciseEvaluations, overallSuccess });
  const jobsheetModelResult = await requestValidModelResult({ scope: 'jobsheet', submissionId: payload.submissionId, jobsheet: payload.jobsheet, experimentResults: successfulExperimentResults, exerciseResults: successfulExerciseResults, studentConclusion: payload.studentConclusion, rubric: payload.rubric, options: payload.options, requestId: payload.requestId });
  return { scope: 'jobsheet', submissionId: payload.submissionId, jobsheetId: payload.jobsheet.id, evaluationStatus: overallSuccess ? 'completed' : 'partially_failed', experimentEvaluations, exerciseEvaluations, jobsheetFeedback: jobsheetModelResult.jobsheetFeedback, rubricScores: jobsheetModelResult.rubricScores || [], totalScoreRecommendation: jobsheetModelResult.totalScoreRecommendation || 0, totalMaxScore: jobsheetModelResult.totalMaxScore || 0, finalGradeRecommendation: jobsheetModelResult.finalGradeRecommendation || 0, source: 'ai', status: 'draft', requiresLecturerReview: true };
}
async function evaluateExperiment(payload) {
  const chunks = createExperimentChunks(payload);
  if (chunks.length > 100) throw new AppError('Source code terlalu besar untuk diproses', { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
  const results = [];
  for (const chunk of chunks) results.push(await requestValidModelResult(chunk));
  return results.length === 1 ? sanitizeEvaluationResult(results[0], payload) : sanitizeEvaluationResult(mergeExperimentResults(results, payload), payload);
}
async function evaluateExercise(payload) {
  const chunks = createExperimentChunks(payload);
  if (chunks.length > 100) throw new AppError('Source code terlalu besar untuk diproses', { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
  const results = [];
  for (const chunk of chunks) results.push(await requestValidModelResult(chunk));
  return results.length === 1 ? sanitizeEvaluationResult(results[0], payload) : sanitizeEvaluationResult(mergeExerciseResults(results, payload), payload);
}
async function requestValidModelResult(payload) {
  const configuredRetries = Number(process.env.AI_MAX_RETRIES);
  const maxRetries = Number.isInteger(configuredRetries) ? configuredRetries : 2;
  let prompt = buildEvaluationPrompt(payload);
  let lastOutput = '';
  let lastErrors = [];
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    lastOutput = await generateJsonText({
      ...prompt,
      requestId: payload.requestId,
      _meta: {
        payload,
        attempt: attempt + 1,
        isRepair: attempt > 0,
        lastOutput,
        lastErrors,
      },
    });
    const validation = parseAndValidate(lastOutput, payload);
    if (validation.valid) return validation.value;
    lastErrors = validation.errors;
    logger.warn('Model output validation failed', { requestId: payload.requestId, submissionId: payload.submissionId, scope: payload.scope, attempt: attempt + 1, errorCount: lastErrors.length });
    if (attempt < maxRetries) prompt = buildRepairPrompt({ invalidOutput: lastOutput, validationErrors: lastErrors, scope: payload.scope });
  }
  throw new AppError('Output AI tidak sesuai format setelah retry', { statusCode: 502, code: 'INVALID_MODEL_RESPONSE', details: lastErrors });
}
function buildJobsheetSummaryFromSectionResults({ submissionId, jobsheetId, experimentEvaluations, exerciseEvaluations, overallSuccess }) {
  const completedExperiments = experimentEvaluations.filter((item) => item.status === 'completed');
  const completedExercises = exerciseEvaluations.filter((item) => item.status === 'completed');
  const failedSections = [...experimentEvaluations, ...exerciseEvaluations].filter((item) => item.status === 'failed');
  const rubricScores = [...completedExperiments.flatMap((item) => item.rubricScores || []), ...completedExercises.flatMap((item) => item.rubricScores || [])];
  const scoreSummary = calculateScoreSummary(rubricScores);
  const experimentAttention = completedExperiments.flatMap((item) => (item.feedback?.issues || []).map((issue) => ({ experimentId: item.experimentId, reason: `${item.step ? `[Langkah ${item.step}] ` : ''}${issue}` })));
  const exerciseAttention = completedExercises.flatMap((item) => (item.feedback?.issues || []).map((issue) => ({ exerciseId: item.exerciseId, reason: issue })));
  return { scope: 'jobsheet', submissionId, jobsheetId, evaluationStatus: overallSuccess ? 'completed' : 'partially_failed', experimentEvaluations, exerciseEvaluations, jobsheetFeedback: { summary: failedSections.length > 0 ? 'Evaluasi jobsheet selesai sebagian. Beberapa bagian gagal dievaluasi otomatis.' : 'Evaluasi jobsheet selesai berdasarkan hasil evaluasi percobaan dan latihan.', overallUnderstanding: uniqueStrings([...completedExperiments.map((item) => item.feedback?.summary), ...completedExercises.map((item) => item.feedback?.summary)]).join('\n\n'), strengths: uniqueStrings([...completedExperiments.flatMap((item) => item.feedback?.strengths || []), ...completedExercises.flatMap((item) => item.feedback?.strengths || [])]), issues: uniqueStrings([...completedExperiments.flatMap((item) => item.feedback?.issues || []), ...completedExercises.flatMap((item) => item.feedback?.issues || []), ...failedSections.map((item) => item.error)]), consistencyEvaluation: 'Mode cepat menyusun evaluasi keseluruhan dari hasil per percobaan dan latihan tanpa panggilan model tambahan.', conclusionEvaluation: 'Kesimpulan mahasiswa dinilai pada evaluasi per bagian yang tersedia.', experimentsNeedingAttention: experimentAttention, exercisesNeedingAttention: exerciseAttention, learningSuggestions: uniqueStrings([...completedExperiments.flatMap((item) => item.feedback?.suggestions || []), ...completedExercises.flatMap((item) => item.feedback?.suggestions || [])]) }, rubricScores, ...scoreSummary, source: 'ai', status: 'draft', requiresLecturerReview: true };
}
function countSectionFeedbacks(result) { if (Array.isArray(result.experimentEvaluations) || Array.isArray(result.exerciseEvaluations)) return [...(result.experimentEvaluations || []), ...(result.exerciseEvaluations || [])].filter((item) => item.feedback || item.status === 'completed').length; if (result.experimentFeedback || result.exerciseFeedback || result.jobsheetFeedback) return 1; return 0; }
function countComments(result) { return Array.isArray(result.comments) ? result.comments.length : 0; }
function countCodeFeedbacks(result) { if (Array.isArray(result.codeFeedbacks)) return result.codeFeedbacks.length; return [...(result.experimentEvaluations || []), ...(result.exerciseEvaluations || [])].reduce((total, item) => total + (item.codeFeedbacks?.length || 0), 0); }
module.exports = { evaluateSubmission, evaluateExperiment, evaluateExercise, requestValidModelResult, buildJobsheetSummaryFromSectionResults, countSectionFeedbacks, countComments, countCodeFeedbacks };
