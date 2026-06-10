const Joi = require('joi');

const {
  idSchema,
  jobsheetSchema,
  experimentSchema,
  experimentResultSummarySchema,
  exerciseSchema,
  exerciseResultSummarySchema,
  rubricSchema,
  evaluationOptionsSchema,
} = require('./commonSchema');

const baseFields = {
  requestId: Joi.string().trim().min(1).max(200).optional(),
  submissionId: idSchema,
  jobsheet: jobsheetSchema,
  rubric: rubricSchema,
  options: evaluationOptionsSchema,
};

const experimentEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('experiment').required(),
  ...baseFields,
  experiment: experimentSchema,
})
  .custom(validateExperimentRequest)
  .required();

const exerciseEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('exercise').required(),
  ...baseFields,
  exercise: exerciseSchema,
})
  .custom(validateExerciseRequest)
  .required();

const jobsheetEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('jobsheet').required(),
  ...baseFields,
  experiments: Joi.array()
    .items(experimentSchema)
    .min(1)
    .max(100)
    .required(),
  exercises: Joi.array()
    .items(exerciseSchema)
    .max(100)
    .optional()
    .default([]),
  studentConclusion: Joi.string().allow('').max(100000).default(''),
})
  .custom(validateJobsheetRequest)
  .required();

const evaluationRequestSchema = Joi.alternatives()
  .try(
    experimentEvaluationRequestSchema,
    exerciseEvaluationRequestSchema,
    jobsheetEvaluationRequestSchema,
  )
  .match('one');

function validateExperimentRequest(payload, helpers) {
  const duplicateCriterion = findDuplicateValue(
    payload.rubric?.criteria || [],
    'id',
  );
  if (duplicateCriterion) {
    return helpers.message({
      custom: `Criterion ID "${duplicateCriterion}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateFileId = findDuplicateValue(payload.experiment.files, 'id');
  if (duplicateFileId) {
    return helpers.message({
      custom: `File ID "${duplicateFileId}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateFilePath = findDuplicateValue(
    payload.experiment.files,
    'path',
  );
  if (duplicateFilePath) {
    return helpers.message({
      custom: `Path file "${duplicateFilePath}" digunakan lebih dari satu kali`,
    });
  }

  const invalidLanguageFile = payload.experiment.files.find(
    (file) => file.language && file.language !== payload.experiment.language,
  );
  if (invalidLanguageFile) {
    return helpers.message({
      custom: `Bahasa file "${invalidLanguageFile.path}" harus sama dengan bahasa percobaan`,
    });
  }

  const testCases = payload.experiment.execution?.testCases || [];
  const duplicateTestCaseId = findDuplicateValue(testCases, 'id');
  if (duplicateTestCaseId) {
    return helpers.message({
      custom: `Test case ID "${duplicateTestCaseId}" digunakan lebih dari satu kali`,
    });
  }

  return payload;
}

function validateExerciseRequest(payload, helpers) {
  const duplicateCriterion = findDuplicateValue(
    payload.rubric?.criteria || [],
    'id',
  );
  if (duplicateCriterion) {
    return helpers.message({
      custom: `Criterion ID "${duplicateCriterion}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateFileId = findDuplicateValue(payload.exercise.files, 'id');
  if (duplicateFileId) {
    return helpers.message({
      custom: `File ID "${duplicateFileId}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateFilePath = findDuplicateValue(
    payload.exercise.files,
    'path',
  );
  if (duplicateFilePath) {
    return helpers.message({
      custom: `Path file "${duplicateFilePath}" digunakan lebih dari satu kali`,
    });
  }

  const invalidLanguageFile = payload.exercise.files.find(
    (file) => file.language && file.language !== payload.exercise.language,
  );
  if (invalidLanguageFile) {
    return helpers.message({
      custom: `Bahasa file "${invalidLanguageFile.path}" harus sama dengan bahasa latihan`,
    });
  }

  const testCases = payload.exercise.execution?.testCases || [];
  const duplicateTestCaseId = findDuplicateValue(testCases, 'id');
  if (duplicateTestCaseId) {
    return helpers.message({
      custom: `Test case ID "${duplicateTestCaseId}" digunakan lebih dari satu kali`,
    });
  }

  return payload;
}

function validateJobsheetRequest(payload, helpers) {
  const duplicateCriterion = findDuplicateValue(
    payload.rubric?.criteria || [],
    'id',
  );
  if (duplicateCriterion) {
    return helpers.message({
      custom: `Criterion ID "${duplicateCriterion}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateExperimentId = findDuplicateValue(
    payload.experiments || [],
    'id',
  );
  if (duplicateExperimentId) {
    return helpers.message({
      custom: `Experiment ID "${duplicateExperimentId}" digunakan lebih dari satu kali`,
    });
  }

  const duplicateExerciseId = findDuplicateValue(
    payload.exercises || [],
    'id',
  );
  if (duplicateExerciseId) {
    return helpers.message({
      custom: `Exercise ID "${duplicateExerciseId}" digunakan lebih dari satu kali`,
    });
  }

  return payload;
}


function findDuplicateValue(items, field) {
  const values = new Set();

  for (const item of items) {
    const value = item[field];
    if (values.has(value)) {
      return value;
    }
    values.add(value);
  }

  return null;
}

function validateEvaluationRequest(payload) {
  return evaluationRequestSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
    convert: true,
  });
}

module.exports = {
  evaluationRequestSchema,
  experimentEvaluationRequestSchema,
  exerciseEvaluationRequestSchema,
  jobsheetEvaluationRequestSchema,
  validateEvaluationRequest,
};
