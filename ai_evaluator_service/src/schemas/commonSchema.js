const Joi = require('joi');

const idSchema = Joi.string().trim().min(1).max(500).allow(null, '').optional();
const titleSchema = Joi.string().trim().min(1).max(1000).allow('', null).optional().default('Untitled');
const textSchema = Joi.string().allow('', null).max(200000);
const programmingLanguageSchema = Joi.string().trim().min(1).max(50).default('java');

const sourceFileSchema = Joi.object({
  id: Joi.string().trim().min(1).max(500).allow(null, '').optional().default('file-1'),
  path: Joi.string().trim().min(1).max(2000).required(),
  language: Joi.string().allow('', null).optional(),
  content: Joi.string().allow('').max(2000000).default(''),
}).unknown(true);

const testCaseSchema = Joi.object({
  id: Joi.string().trim().min(1).max(500).allow(null, '').optional(),
  name: Joi.string().trim().allow('').max(500).default(''),
  input: textSchema.default(''),
  expectedOutput: textSchema.default(''),
  actualOutput: textSchema.default(''),
  status: Joi.string().allow('', null).default('not_run'),
}).unknown(true);

const executionSchema = Joi.object({
  status: Joi.string().allow('', null).default('not_available'),
  stdin: textSchema.default(''),
  stdout: textSchema.default(''),
  stderr: textSchema.default(''),
  expectedOutput: textSchema.default(''),
  exitCode: Joi.number().integer().allow(null).optional(),
  durationMs: Joi.number().allow(null).optional(),
  testCases: Joi.array().items(testCaseSchema).max(200).default([]),
}).unknown(true);

const rubricCriterionSchema = Joi.object({
  id: Joi.string().trim().min(1).max(500).allow(null, '').optional(),
  name: Joi.string().trim().min(1).max(500).allow('', null).default('Rubrik'),
  description: Joi.string().allow('').max(10000).default(''),
  maxScore: Joi.number().default(100),
}).unknown(true);

const rubricSchema = Joi.object({
  criteria: Joi.array().items(rubricCriterionSchema).max(100).default([]),
}).unknown(true).default({ criteria: [] });

const rubricScoreSummarySchema = Joi.object({
  criterionId: idSchema,
  score: Joi.number().min(0).default(0),
  maxScore: Joi.number().default(100),
  reason: Joi.string().allow('').max(10000).default(''),
}).unknown(true);

const jobsheetSchema = Joi.object({
  id: Joi.string().trim().min(1).max(500).allow(null, '').optional(),
  title: Joi.string().trim().min(1).max(1000).allow('', null).default('Jobsheet'),
  description: Joi.string().allow('').max(50000).default(''),
  objectives: Joi.array()
    .items(Joi.string().trim().min(1).max(5000))
    .max(100)
    .default([]),
}).unknown(true).default({ id: 'jobsheet-1', title: 'Jobsheet' });

const instructionSchema = Joi.alternatives()
  .try(
    Joi.string().allow('').max(100000),
    Joi.array().items(Joi.any()).max(1000),
    Joi.object().unknown(true),
  )
  .default('');

const experimentSchema = Joi.object({
  id: Joi.string().trim().min(1).max(500).allow(null, '').optional(),
  experimentId: Joi.string().trim().min(1).max(500).allow(null, '').optional(),
  step: Joi.number().integer().min(1).optional(),
  title: Joi.string().trim().min(1).max(1000).allow('', null).default('Percobaan'),
  objective: Joi.string().allow('').max(50000).default(''),
  instruction: instructionSchema,
  language: programmingLanguageSchema,
  files: Joi.array().items(sourceFileSchema).max(100).default([]),
  templateFiles: Joi.array().items(sourceFileSchema).max(100).default([]),
  hasStudentCode: Joi.boolean().optional(),
  execution: executionSchema.allow(null).optional(),
  studentAnalysis: Joi.string().allow('').max(100000).default(''),
  studentConclusion: Joi.string().allow('').max(100000).default(''),
  rubric: rubricSchema.optional(),
}).unknown(true);


const experimentResultSummarySchema = Joi.object({
  experimentId: idSchema,
  title: titleSchema,
  summary: Joi.string().allow('').max(50000).required(),
  strengths: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  issues: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  suggestions: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  rubricScores: Joi.array()
    .items(rubricScoreSummarySchema)
    .max(100)
    .default([]),
});

const evaluationOptionsSchema = Joi.object({
  language: Joi.string().trim().min(1).max(20).default('id-ID'),
  includeScoreRecommendation: Joi.boolean().default(true),
  webhookUrl: Joi.string().trim().allow('', null).optional(),
}).unknown(true).default({
  language: 'id-ID',
  includeScoreRecommendation: true,
});

const exerciseSchema = experimentSchema;

const exerciseResultSummarySchema = Joi.object({
  exerciseId: idSchema,
  title: titleSchema,
  summary: Joi.string().allow('').max(50000).required(),
  strengths: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  issues: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  suggestions: Joi.array()
    .items(Joi.string().allow('').max(5000))
    .max(100)
    .default([]),
  rubricScores: Joi.array()
    .items(rubricScoreSummarySchema)
    .max(100)
    .default([]),
});

module.exports = {
  idSchema,
  titleSchema,
  textSchema,
  programmingLanguageSchema,
  sourceFileSchema,
  testCaseSchema,
  executionSchema,
  rubricCriterionSchema,
  rubricSchema,
  rubricScoreSummarySchema,
  jobsheetSchema,
  experimentSchema,
  experimentResultSummarySchema,
  exerciseSchema,
  exerciseResultSummarySchema,
  evaluationOptionsSchema,
};
