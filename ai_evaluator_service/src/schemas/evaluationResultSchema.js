const Joi = require('joi');

const categories = [
  'syntax',
  'logic',
  'runtime',
  'output',
  'test_case',
  'code_quality',
  'readability',
  'maintainability',
  'performance',
  'security',
  'requirement',
  'analysis',
];

const stringArray = Joi.array()
  .items(Joi.string().allow('').max(5000))
  .max(100)
  .default([]);

const rubricScoreSchema = Joi.object({
  criterionId: Joi.string().trim().min(1).max(200).required(),
  score: Joi.number().min(0).required(),
  maxScore: Joi.number().greater(0).required(),
  reason: Joi.string().allow('').max(10000).required(),
}).custom((value, helpers) => {
  if (value.score > value.maxScore) {
    return helpers.error('score.exceeded');
  }
  return value;
}).messages({
  'score.exceeded': 'Score tidak boleh melebihi maxScore',
});

const codeFeedbackSchema = Joi.object({
  fileId: Joi.string().trim().min(1).max(200).required(),
  filePath: Joi.string().trim().min(1).max(1000).required(),
  startLine: Joi.number().integer().min(1).required(),
  endLine: Joi.number().integer().min(1).required(),
  selectedCode: Joi.string().allow('').max(20000).default(''),
  category: Joi.string().valid(...categories).required(),
  severity: Joi.string().valid('low', 'medium', 'high').required(),
  message: Joi.string().trim().min(1).max(10000).required(),
  suggestion: Joi.string().allow('').max(10000).required(),
}).custom((value, helpers) => {
  if (value.startLine > value.endLine) {
    return helpers.error('line.invalidRange');
  }
  return value;
}).messages({
  'line.invalidRange': 'startLine tidak boleh lebih besar dari endLine',
});

const experimentFeedbackSchema = Joi.object({
  summary: Joi.string().allow('').max(20000).required(),
  instructionCompliance: Joi.string().allow('').max(20000).required(),
  codeEvaluation: Joi.string().allow('').max(20000).required(),
  outputEvaluation: Joi.string().allow('').max(20000).required(),
  testCaseEvaluation: Joi.string().allow('').max(20000).required(),
  errorEvaluation: Joi.string().allow('').max(20000).required(),
  analysisEvaluation: Joi.string().allow('').max(20000).required(),
  strengths: stringArray,
  issues: stringArray,
  suggestions: stringArray,
}).required();

const jobsheetFeedbackSchema = Joi.object({
  summary: Joi.string().allow('').max(20000).required(),
  overallUnderstanding: Joi.string().allow('').max(20000).required(),
  strengths: stringArray,
  issues: stringArray,
  consistencyEvaluation: Joi.string().allow('').max(20000).required(),
  conclusionEvaluation: Joi.string().allow('').max(20000).required(),
  experimentsNeedingAttention: Joi.array()
    .items(
      Joi.object({
        experimentId: Joi.string().trim().min(1).max(200).required(),
        reason: Joi.string().trim().min(1).max(10000).required(),
      }),
    )
    .max(100)
    .default([]),
  exercisesNeedingAttention: Joi.array()
    .items(
      Joi.object({
        exerciseId: Joi.string().trim().min(1).max(200).required(),
        reason: Joi.string().trim().min(1).max(10000).required(),
      }),
    )
    .max(100)
    .optional()
    .default([]),
  learningSuggestions: stringArray,
}).required();

const experimentResultSchema = Joi.object({
  scope: Joi.string().valid('experiment').required(),
  submissionId: Joi.string().trim().min(1).max(200).required(),
  experimentId: Joi.string().trim().min(1).max(200).required(),
  codeFeedbacks: Joi.array().items(codeFeedbackSchema).max(1000).default([]),
  experimentFeedback: experimentFeedbackSchema,
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).default([]),
  totalScoreRecommendation: Joi.number().min(0).required(),
  source: Joi.string().valid('ai').required(),
  status: Joi.string().valid('draft').required(),
  requiresLecturerReview: Joi.boolean().valid(true).required(),
}).custom(validateTotalScore);

const exerciseResultSchema = Joi.object({
  scope: Joi.string().valid('exercise').required(),
  submissionId: Joi.string().trim().min(1).max(200).required(),
  exerciseId: Joi.string().trim().min(1).max(200).required(),
  codeFeedbacks: Joi.array().items(codeFeedbackSchema).max(1000).default([]),
  exerciseFeedback: experimentFeedbackSchema,
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).default([]),
  totalScoreRecommendation: Joi.number().min(0).required(),
  source: Joi.string().valid('ai').required(),
  status: Joi.string().valid('draft').required(),
  requiresLecturerReview: Joi.boolean().valid(true).required(),
}).custom(validateTotalScore);

const jobsheetResultSchema = Joi.object({
  scope: Joi.string().valid('jobsheet').required(),
  submissionId: Joi.string().trim().min(1).max(200).required(),
  jobsheetId: Joi.string().trim().min(1).max(200).required(),
  jobsheetFeedback: jobsheetFeedbackSchema,
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).default([]),
  totalScoreRecommendation: Joi.number().min(0).required(),
  source: Joi.string().valid('ai').required(),
  status: Joi.string().valid('draft').required(),
  requiresLecturerReview: Joi.boolean().valid(true).required(),
}).custom(validateTotalScore);

const experimentEvaluationResultSchema = Joi.object({
  experimentId: Joi.string().trim().min(1).max(200).required(),
  status: Joi.string().valid('completed', 'failed').required(),
  codeFeedbacks: Joi.array().items(codeFeedbackSchema).max(1000).optional().default([]),
  feedback: experimentFeedbackSchema.optional(),
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).optional().default([]),
  totalScoreRecommendation: Joi.number().min(0).optional(),
  error: Joi.string().allow('').max(10000).optional()
});

const exerciseEvaluationResultSchema = Joi.object({
  exerciseId: Joi.string().trim().min(1).max(200).required(),
  status: Joi.string().valid('completed', 'failed').required(),
  codeFeedbacks: Joi.array().items(codeFeedbackSchema).max(1000).optional().default([]),
  feedback: experimentFeedbackSchema.optional(),
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).optional().default([]),
  totalScoreRecommendation: Joi.number().min(0).optional(),
  error: Joi.string().allow('').max(10000).optional()
});

const jobsheetFullResultSchema = Joi.object({
  scope: Joi.string().valid('jobsheet').required(),
  submissionId: Joi.string().trim().min(1).max(200).required(),
  jobsheetId: Joi.string().trim().min(1).max(200).required(),
  evaluationStatus: Joi.string().valid('completed', 'partially_failed').required(),
  experimentEvaluations: Joi.array().items(experimentEvaluationResultSchema).min(1).max(100).required(),
  exerciseEvaluations: Joi.array().items(exerciseEvaluationResultSchema).max(100).optional().default([]),
  jobsheetFeedback: jobsheetFeedbackSchema,
  rubricScores: Joi.array().items(rubricScoreSchema).max(100).default([]),
  totalScoreRecommendation: Joi.number().min(0).required(),
  source: Joi.string().valid('ai').required(),
  status: Joi.string().valid('draft').required(),
  requiresLecturerReview: Joi.boolean().valid(true).required(),
}).custom(validateTotalScore);

const evaluationResultSchema = Joi.alternatives()
  .try(experimentResultSchema, exerciseResultSchema, jobsheetResultSchema)
  .match('one');

function validateTotalScore(value, helpers) {
  const calculatedTotal = value.rubricScores.reduce(
    (total, item) => total + item.score,
    0,
  );

  if (Math.abs(calculatedTotal - value.totalScoreRecommendation) > 0.0001) {
    return helpers.error('score.totalMismatch');
  }

  return value;
}

function validateEvaluationResult(payload) {
  return evaluationResultSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
    convert: true,
  });
}

function validateFullJobsheetResult(payload) {
  return jobsheetFullResultSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
    convert: true,
  });
}

module.exports = {
  categories,
  rubricScoreSchema,
  codeFeedbackSchema,
  experimentFeedbackSchema,
  jobsheetFeedbackSchema,
  experimentResultSchema,
  exerciseResultSchema,
  jobsheetResultSchema,
  jobsheetFullResultSchema,
  evaluationResultSchema,
  validateEvaluationResult,
  validateFullJobsheetResult,
};

