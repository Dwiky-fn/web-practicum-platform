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
  schemaVersion: Joi.string().valid('1.0').optional(),
  submissionId: idSchema.optional(),
  submission: Joi.object({
    id: idSchema,
    source: Joi.string().valid('manual', 'auto_deadline', 'remedial').required(),
    attemptType: Joi.string().valid('normal', 'remedial').required(),
    attemptNo: Joi.number().integer().min(1).required(),
    remedialId: Joi.string().trim().min(1).max(200).allow(null).default(null),
    isAutoSubmitted: Joi.boolean().default(false),
  }).unknown(true).optional(),
  context: Joi.object({
    kelasPraktikumId: Joi.string().trim().min(1).max(200).allow(null).optional(),
    idKelasMhs: Joi.string().trim().min(1).max(200).allow(null).optional(),
    studentId: Joi.string().trim().min(1).max(200).allow(null).optional(),
    classId: Joi.string().trim().min(1).max(200).allow(null).optional(),
    programmingLanguage: Joi.string().valid('java', 'python').required(),
    courseName: Joi.string().allow('').max(500).default(''),
  }).unknown(true).optional(),
  jobsheet: jobsheetSchema,
  rubric: rubricSchema,
  options: evaluationOptionsSchema,
  webhookUrl: Joi.string().trim().allow('', null).optional(),
  callbackUrl: Joi.string().trim().allow('', null).optional(),
};

const experimentEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('experiment').required(),
  ...baseFields,
  experiment: experimentSchema.required(),
})
  .unknown(true)
  .custom(normalizeCanonicalRequest)
  .custom(validateExperimentRequest)
  .required();

const exerciseEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('exercise').required(),
  ...baseFields,
  exercise: exerciseSchema.required(),
})
  .unknown(true)
  .custom(normalizeCanonicalRequest)
  .custom(validateExerciseRequest)
  .required();

const jobsheetEvaluationRequestSchema = Joi.object({
  scope: Joi.string().valid('jobsheet').required(),
  ...baseFields,
  experiments: Joi.array()
    .items(experimentSchema)
    .max(100)
    .required(),
  exercises: Joi.array()
    .items(exerciseSchema)
    .max(100)
    .optional()
    .default([]),
  studentConclusion: Joi.string().allow('').max(100000).default(''),
})
  .unknown(true)
  .custom(normalizeCanonicalRequest)
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
  const submissionError = validateSubmissionContext(payload, helpers);
  if (submissionError) return submissionError;

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
  const submissionError = validateSubmissionContext(payload, helpers);
  if (submissionError) return submissionError;

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
  const submissionError = validateSubmissionContext(payload, helpers);
  if (submissionError) return submissionError;

  if ((payload.experiments || []).length === 0 && (payload.exercises || []).length === 0) {
    return helpers.message({
      custom: 'Payload jobsheet harus memiliki minimal satu percobaan atau latihan',
    });
  }

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

function normalizeCanonicalRequest(payload) {
  const submissionId = payload.submissionId || payload.submission?.id;
  const normalized = {
    ...payload,
    submissionId,
  };

  if (!normalized.submission && submissionId) {
    normalized.submission = {
      id: submissionId,
      source: 'manual',
      attemptType: 'normal',
      attemptNo: 1,
      remedialId: null,
      isAutoSubmitted: false,
    };
  }

  return normalized;
}

function validateSubmissionContext(payload, helpers) {
  if (!payload.submissionId) {
    return helpers.message({
      custom: 'submission.id atau submissionId wajib diisi',
    });
  }

  if (payload.schemaVersion && !payload.context) {
    return helpers.message({
      custom: 'context wajib dikirim untuk payload canonical',
    });
  }

  if (payload.schemaVersion && !payload.submission) {
    return helpers.message({
      custom: 'submission wajib dikirim untuk payload canonical',
    });
  }

  if (payload.submission?.attemptType === 'normal' && payload.submission?.remedialId) {
    return helpers.message({
      custom: 'remedialId harus kosong untuk Pengerjaan Normal',
    });
  }

  if (payload.submission?.attemptType === 'remedial' && !payload.submission?.remedialId) {
    return helpers.message({
      custom: 'remedialId wajib diisi untuk Pengerjaan Remedial',
    });
  }

  return null;
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
    allowUnknown: true,
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
