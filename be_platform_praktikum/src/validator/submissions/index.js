const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const stepPayloadSchema = Joi.object({
  experimentId: Joi.string().required(),
  instructionId: Joi.string().required(),
  instructionNumber: Joi.number().integer().positive().required(),
  files: Joi.object()
    .pattern(Joi.string(), Joi.string())
    .required(),
  output: Joi.string().allow('').default(''),
  analysis: Joi.object().required(),
});

const SubmissionsValidator = {
  validateStepPayload: (payload) => validateWithSchema(stepPayloadSchema, payload),
};

module.exports = SubmissionsValidator;
