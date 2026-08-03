const { validateEvaluationResult } = require('../../schemas/evaluationResultSchema');
const { parseJsonResponse } = require('../../utils/jsonParser');
const { calculateScoreSummary } = require('./scoreSummary');

function normalizeNewlines(value) { return String(value).replace(/\r\n/g, '\n'); }
function coerceFeedbackText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(coerceFeedbackText).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => { const text = coerceFeedbackText(item); return text ? `${key}: ${text}` : ''; }).filter(Boolean).join('\n');
  return String(value);
}
function normalizeFeedbackTextFields(feedback) {
  if (!feedback || typeof feedback !== 'object') return feedback;
  ['summary','instructionCompliance','codeEvaluation','outputEvaluation','testCaseEvaluation','errorEvaluation','analysisEvaluation','overallUnderstanding','consistencyEvaluation','conclusionEvaluation'].forEach((field) => { if (Object.prototype.hasOwnProperty.call(feedback, field)) feedback[field] = coerceFeedbackText(feedback[field]); });
  return feedback;
}
function normalizeModelOutputShape(result) { if (!result || typeof result !== 'object') return result; normalizeFeedbackTextFields(result.experimentFeedback); normalizeFeedbackTextFields(result.exerciseFeedback); normalizeFeedbackTextFields(result.jobsheetFeedback); return result; }
function mapJoiErrors(error) { const errors = []; function collect(detail) { if (detail.context && Array.isArray(detail.context.details)) detail.context.details.forEach(collect); else if (Array.isArray(detail.details)) detail.details.forEach(collect); else errors.push({ path: Array.isArray(detail.path) ? detail.path.join('.') : '', type: detail.type, message: detail.message.replace(/"/g, '') }); } error.details.forEach(collect); return errors; }
function domainError(path, message) { return { path, type: 'domain.validation', message }; }
function getCanonicalExperimentId(experiment = {}) { return experiment.experimentId || experiment.id; }
function getValidExperimentResponseIds(experiment = {}) { return new Set([experiment.id, experiment.experimentId].filter(Boolean)); }
function validateResultAgainstPayload(result, payload) {
  const errors = [];
  if (result.scope !== payload.scope) errors.push(domainError('scope', 'Scope response tidak sesuai request'));
  if (result.submissionId !== payload.submissionId) errors.push(domainError('submissionId', 'submissionId response tidak sesuai request'));
  if (payload.scope === 'experiment' && !getValidExperimentResponseIds(payload.experiment).has(result.experimentId)) errors.push(domainError('experimentId', 'experimentId response tidak sesuai request'));
  if (payload.scope === 'exercise' && result.exerciseId !== payload.exercise.id) errors.push(domainError('exerciseId', 'exerciseId response tidak sesuai request'));
  if (payload.scope === 'jobsheet' && result.jobsheetId !== payload.jobsheet.id) errors.push(domainError('jobsheetId', 'jobsheetId response tidak sesuai request'));
  if (payload.scope === 'experiment' || payload.scope === 'exercise') {
    const targetKey = payload.scope === 'experiment' ? 'experiment' : 'exercise';
    const files = new Map(payload[targetKey].files.map((file) => [file.id, file]));
    result.codeFeedbacks.forEach((feedback, index) => {
      const file = files.get(feedback.fileId);
      if (!file || file.path !== feedback.filePath) { errors.push(domainError(`codeFeedbacks.${index}.fileId`, 'Code feedback merujuk ke file yang tidak tersedia')); return; }
      const lineOffset = Number(file._lineOffset) || 0;
      const lineCount = String(file.content).split(/\r?\n/).length;
      const firstLine = lineOffset + 1;
      const lastLine = lineOffset + lineCount;
      if (feedback.startLine < firstLine || feedback.endLine > lastLine) errors.push(domainError(`codeFeedbacks.${index}.startLine`, 'Nomor baris berada di luar rentang file yang dievaluasi'));
    });
    result.codeFeedbacks = result.codeFeedbacks.map((feedback) => ({ ...feedback, experimentId: payload.scope === 'experiment' ? getCanonicalExperimentId(payload.experiment) : feedback.experimentId, step: payload.scope === 'experiment' ? payload.experiment.step || feedback.step : feedback.step }));
  }
  const criteria = new Map(payload.rubric.criteria.map((item) => [item.id, item]));
  const usedCriterionIds = new Set();
  result.rubricScores.forEach((score, index) => {
    const criterion = criteria.get(score.criterionId);
    if (!criterion) { errors.push(domainError(`rubricScores.${index}.criterionId`, 'criterionId tidak tersedia pada rubrik')); return; }
    if (usedCriterionIds.has(score.criterionId)) errors.push(domainError(`rubricScores.${index}.criterionId`, 'criterionId digunakan lebih dari satu kali'));
    usedCriterionIds.add(score.criterionId);
    if (Math.abs(score.maxScore - criterion.maxScore) > 0.0001) errors.push(domainError(`rubricScores.${index}.maxScore`, 'maxScore tidak sesuai dengan rubrik'));
  });
  if (payload.options?.includeScoreRecommendation !== false) criteria.forEach((criterion) => { if (!usedCriterionIds.has(criterion.id)) errors.push(domainError('rubricScores', `Rekomendasi nilai untuk criterionId "${criterion.id}" belum tersedia`)); });
  if (payload.scope === 'jobsheet') {
    const validExperimentIds = new Set(payload.experimentResults.map((item) => item.experimentId));
    result.jobsheetFeedback.experimentsNeedingAttention.forEach((item, index) => { if (!validExperimentIds.has(item.experimentId)) errors.push(domainError(`jobsheetFeedback.experimentsNeedingAttention.${index}.experimentId`, 'experimentId tidak tersedia pada experimentResults')); });
    if (result.jobsheetFeedback.exercisesNeedingAttention) {
      const validExerciseIds = new Set((payload.exerciseResults || []).map((item) => item.exerciseId));
      result.jobsheetFeedback.exercisesNeedingAttention.forEach((item, index) => { if (!validExerciseIds.has(item.exerciseId)) errors.push(domainError(`jobsheetFeedback.exercisesNeedingAttention.${index}.exerciseId`, 'exerciseId tidak tersedia pada exerciseResults')); });
    }
  }
  return errors;
}
function sanitizeEvaluationResult(result, originalPayload) {
  let targetKey = 'experiment';
  if (originalPayload.scope === 'exercise') targetKey = 'exercise';
  else if (originalPayload.exercise && !originalPayload.experiment) targetKey = 'exercise';
  const idKey = targetKey === 'experiment' ? 'experimentId' : 'exerciseId';
  const validFeedbacks = [];
  const targetObj = originalPayload[targetKey];
  const filesById = new Map(targetObj.files.map((file) => [file.id, file]));
  result.codeFeedbacks.forEach((feedback) => {
    const file = filesById.get(feedback.fileId);
    const lineCount = file ? String(file.content).split(/\r?\n/).length : 0;
    const samePath = file && file.path === feedback.filePath;
    const lineOffset = Number(file?._lineOffset) || 0;
    const firstLine = lineOffset + 1;
    const lastLine = lineOffset + lineCount;
    const validRange = feedback.startLine >= firstLine && feedback.endLine >= feedback.startLine && feedback.endLine <= lastLine;
    if (!file || !samePath || !validRange) return;
    const expectedSelectedCode = String(file.content).split(/\r?\n/).slice(feedback.startLine - firstLine, feedback.endLine - firstLine + 1).join('\n');
    if (feedback.selectedCode && normalizeNewlines(feedback.selectedCode).trim() !== normalizeNewlines(expectedSelectedCode).trim()) return;
    validFeedbacks.push({ ...feedback, experimentId: originalPayload.scope === 'experiment' ? getCanonicalExperimentId(targetObj) : feedback.experimentId, step: originalPayload.scope === 'experiment' ? targetObj.step || feedback.step : feedback.step, selectedCode: expectedSelectedCode });
  });
  return { ...result, ...(originalPayload.scope === 'experiment' ? { experimentId: getCanonicalExperimentId(targetObj), ...(targetObj.step ? { step: targetObj.step } : {}) } : {}), codeFeedbacks: validFeedbacks };
}
function parseAndValidate(rawOutput, payload) {
  let parsed;
  try { parsed = parseJsonResponse(rawOutput); } catch (error) { return { valid: false, errors: [{ path: '', type: 'json.parse', message: error.message }] }; }
  parsed = normalizeModelOutputShape(parsed);
  const { error, value } = validateEvaluationResult(parsed);
  if (error) return { valid: false, errors: mapJoiErrors(error) };
  if (payload.scope === 'jobsheet') {
    const combinedRubricScores = [];
    if (Array.isArray(payload.experimentResults)) payload.experimentResults.forEach((exp) => { if (Array.isArray(exp.rubricScores)) combinedRubricScores.push(...exp.rubricScores); });
    if (Array.isArray(payload.exerciseResults)) payload.exerciseResults.forEach((exe) => { if (Array.isArray(exe.rubricScores)) combinedRubricScores.push(...exe.rubricScores); });
    value.rubricScores = combinedRubricScores;
  }
  const domainErrors = validateResultAgainstPayload(value, payload);
  if (domainErrors.length > 0) return { valid: false, errors: domainErrors };
  const scoreSummary = calculateScoreSummary(value.rubricScores || []);
  return { valid: true, value: { ...value, ...scoreSummary, source: 'ai', status: 'draft', requiresLecturerReview: true } };
}
module.exports = { parseAndValidate, validateResultAgainstPayload, sanitizeEvaluationResult, normalizeModelOutputShape, normalizeNewlines, coerceFeedbackText, mapJoiErrors, domainError, getCanonicalExperimentId };
