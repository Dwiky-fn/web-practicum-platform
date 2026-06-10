const Joi = require('joi');

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
  validateStepPayload: (payload) => {
    return stepPayloadSchema.validate(payload);
  },
};

module.exports = SubmissionsValidator;
