const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const jobsheetPayloadSchema = Joi.object({
  editorMode: Joi.string().valid('mini_ide').default('mini_ide'),
  editor_mode: Joi.string().valid('mini_ide').default('mini_ide'),
}).unknown(true);

module.exports = {
  validateJobsheetPayload: (payload) => validateWithSchema(jobsheetPayloadSchema, payload),
};
