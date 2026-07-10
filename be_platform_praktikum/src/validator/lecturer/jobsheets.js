const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const jobsheetPayloadSchema = Joi.object({
  editorMode: Joi.string().valid('mini_ide').default('mini_ide'),
  editor_mode: Joi.string().valid('mini_ide').default('mini_ide'),
  urutan: Joi.number().integer().min(1),
  sequence: Joi.number().integer().min(1),
  jobsheet_number: Joi.number().integer().min(1),
}).unknown(true);

module.exports = {
  validateJobsheetPayload: (payload) => validateWithSchema(jobsheetPayloadSchema, payload),
};
