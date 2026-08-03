const { calculateScoreSummary } = require('./scoreSummary');
const { uniqueStrings } = require('./resultUtils');
const { getCanonicalExperimentId } = require('./validation');
function mergeExerciseResults(results, payload) {
  const feedbackKeys = ['summary','instructionCompliance','codeEvaluation','outputEvaluation','testCaseEvaluation','errorEvaluation','analysisEvaluation'];
  const exerciseFeedback = {};
  feedbackKeys.forEach((key) => { exerciseFeedback[key] = uniqueStrings(results.map((item) => item.exerciseFeedback[key])).join('\n\n'); });
  exerciseFeedback.strengths = uniqueStrings(results.flatMap((item) => item.exerciseFeedback.strengths));
  exerciseFeedback.issues = uniqueStrings(results.flatMap((item) => item.exerciseFeedback.issues));
  exerciseFeedback.suggestions = uniqueStrings(results.flatMap((item) => item.exerciseFeedback.suggestions));
  const rubricScores = payload.options?.includeScoreRecommendation === false ? [] : payload.rubric.criteria.map((criterion) => {
    const matches = results.flatMap((item) => item.rubricScores).filter((item) => item.criterionId === criterion.id);
    if (matches.length === 0) return { criterionId: criterion.id, score: 0, maxScore: criterion.maxScore, reason: 'Model tidak memberikan rekomendasi pada chunk ini.' };
    const averageScore = matches.reduce((total, item) => total + item.score, 0) / matches.length;
    return { criterionId: criterion.id, score: Math.min(criterion.maxScore, Number(averageScore.toFixed(2))), maxScore: criterion.maxScore, reason: uniqueStrings(matches.map((item) => item.reason)).join(' ') };
  });
  return { scope: 'exercise', submissionId: payload.submissionId, exerciseId: payload.exercise.id, codeFeedbacks: results.flatMap((item) => item.codeFeedbacks), exerciseFeedback, rubricScores, totalScoreRecommendation: rubricScores.reduce((total, item) => total + item.score, 0), ...calculateScoreSummary(rubricScores), source: 'ai', status: 'draft', requiresLecturerReview: true };
}
function mergeExperimentResults(results, payload) {
  const feedbackKeys = ['summary','instructionCompliance','codeEvaluation','outputEvaluation','testCaseEvaluation','errorEvaluation','analysisEvaluation'];
  const experimentFeedback = {};
  feedbackKeys.forEach((key) => { experimentFeedback[key] = uniqueStrings(results.map((item) => item.experimentFeedback[key])).join('\n\n'); });
  experimentFeedback.strengths = uniqueStrings(results.flatMap((item) => item.experimentFeedback.strengths));
  experimentFeedback.issues = uniqueStrings(results.flatMap((item) => item.experimentFeedback.issues));
  experimentFeedback.suggestions = uniqueStrings(results.flatMap((item) => item.experimentFeedback.suggestions));
  const rubricScores = payload.options?.includeScoreRecommendation === false ? [] : payload.rubric.criteria.map((criterion) => {
    const matches = results.flatMap((item) => item.rubricScores).filter((item) => item.criterionId === criterion.id);
    if (matches.length === 0) return { criterionId: criterion.id, score: 0, maxScore: criterion.maxScore, reason: 'Model tidak memberikan rekomendasi pada chunk ini.' };
    const averageScore = matches.reduce((total, item) => total + item.score, 0) / matches.length;
    return { criterionId: criterion.id, score: Math.min(criterion.maxScore, Number(averageScore.toFixed(2))), maxScore: criterion.maxScore, reason: uniqueStrings(matches.map((item) => item.reason)).join(' ') };
  });
  return { scope: 'experiment', submissionId: payload.submissionId, experimentId: getCanonicalExperimentId(payload.experiment), codeFeedbacks: results.flatMap((item) => item.codeFeedbacks), experimentFeedback, rubricScores, totalScoreRecommendation: rubricScores.reduce((total, item) => total + item.score, 0), ...calculateScoreSummary(rubricScores), source: 'ai', status: 'draft', requiresLecturerReview: true };
}
module.exports = { mergeExerciseResults, mergeExperimentResults };
