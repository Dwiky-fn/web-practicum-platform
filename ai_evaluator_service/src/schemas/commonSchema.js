const Joi = require('joi');

const idSchema = Joi.string().trim().min(1).max(200).required();
const titleSchema = Joi.string().trim().min(1).max(500).required();
const textSchema = Joi.string().allow('').max(100000);
const programmingLanguageSchema = Joi.string()
  .valid('java', 'python')
  .required();

const sourceFileSchema = Joi.object({
  id: idSchema.messages({
    'any.required': 'ID file wajib diisi',
    'string.empty': 'ID file tidak boleh kosong',
  }),
  path: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .custom((value, helpers) => {
      if (value.includes('\0')) {
        return helpers.error('filePath.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.required': 'Path file wajib diisi',
      'string.empty': 'Path file tidak boleh kosong',
      'filePath.invalid': 'Path file mengandung karakter tidak valid',
    }),
  language: Joi.string().valid('java', 'python').optional(),
  content: Joi.string().allow('').max(1000000).required().messages({
    'any.required': 'Isi file wajib dikirim',
    'string.max': 'Isi file terlalu besar',
  }),
});

const testCaseSchema = Joi.object({
  id: idSchema,
  name: Joi.string().trim().allow('').max(500).default(''),
  input: textSchema.default(''),
  expectedOutput: textSchema.default(''),
  actualOutput: textSchema.default(''),
  status: Joi.string()
    .valid('passed', 'failed', 'error', 'skipped', 'not_run')
    .required(),
});

const executionSchema = Joi.object({
  status: Joi.string()
    .valid(
      'success',
      'compiler_error',
      'runtime_error',
      'timeout',
      'failed',
      'not_run',
    )
    .required(),
  stdin: textSchema.default(''),
  stdout: textSchema.default(''),
  stderr: textSchema.default(''),
  expectedOutput: textSchema.default(''),
  exitCode: Joi.number().integer().allow(null).optional(),
  durationMs: Joi.number().min(0).optional(),
  testCases: Joi.array().items(testCaseSchema).max(200).default([]),
});

const rubricCriterionSchema = Joi.object({
  id: idSchema,
  name: Joi.string().trim().min(1).max(500).required(),
  description: Joi.string().allow('').max(10000).default(''),
  maxScore: Joi.number().greater(0).required(),
});

const rubricSchema = Joi.object({
  criteria: Joi.array().items(rubricCriterionSchema).max(100).default([]),
}).default({ criteria: [] });

const rubricScoreSummarySchema = Joi.object({
  criterionId: idSchema,
  score: Joi.number().min(0).required(),
  maxScore: Joi.number().greater(0).required(),
  reason: Joi.string().allow('').max(10000).default(''),
})
  .custom((value, helpers) => {
    if (value.score > value.maxScore) {
      return helpers.error('rubric.scoreExceeded');
    }
    return value;
  })
  .messages({
    'rubric.scoreExceeded': 'Score tidak boleh melebihi maxScore',
  });

const jobsheetSchema = Joi.object({
  id: idSchema,
  title: titleSchema,
  description: Joi.string().allow('').max(50000).default(''),
  objectives: Joi.array()
    .items(Joi.string().trim().min(1).max(5000))
    .max(100)
    .default([]),
}).required();

const instructionSchema = Joi.alternatives()
  .try(
    Joi.string().allow('').max(100000),
    Joi.array().items(Joi.any()).max(1000),
    Joi.object().unknown(true),
  )
  .required();

const experimentSchema = Joi.object({
  id: idSchema,
  title: titleSchema,
  objective: Joi.string().allow('').max(50000).default(''),
  instruction: instructionSchema,
  language: programmingLanguageSchema,
  files: Joi.array().items(sourceFileSchema).min(1).max(100).required(),
  execution: executionSchema.allow(null).optional(),
  studentAnalysis: Joi.string().allow('').max(100000).default(''),
  studentConclusion: Joi.string().allow('').max(100000).default(''),
  rubric: rubricSchema.optional(),
}).required();


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
}).default({
  language: 'id-ID',
  includeScoreRecommendation: true,
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
  evaluationOptionsSchema,
};
