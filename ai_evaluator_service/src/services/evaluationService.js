const { evaluateSubmission, evaluateExercise, evaluateExperiment, requestValidModelResult, buildJobsheetSummaryFromSectionResults, countSectionFeedbacks, countComments, countCodeFeedbacks } = require('./evaluation/orchestrator');
const { parseAndValidate, validateResultAgainstPayload, sanitizeEvaluationResult } = require('./evaluation/validation');
const { mergeExperimentResults, mergeExerciseResults } = require('./evaluation/mergeResults');
const { deduplicateCodeFeedbacks, addSectionMetadataToCodeFeedbacks } = require('./evaluation/resultUtils');
const { calculateScoreSummary } = require('./evaluation/scoreSummary');
module.exports = {
  evaluateSubmission,
  evaluateExercise,
  evaluateExperiment,
  requestValidModelResult,
  parseAndValidate,
  validateResultAgainstPayload,
  sanitizeExperimentResult: sanitizeEvaluationResult,
  sanitizeExerciseResult: sanitizeEvaluationResult,
  mergeExperimentResults,
  mergeExerciseResults,
  deduplicateCodeFeedbacks,
  addSectionMetadataToCodeFeedbacks,
  calculateScoreSummary,
  buildJobsheetSummaryFromSectionResults,
  countSectionFeedbacks,
  countComments,
  countCodeFeedbacks,
};
