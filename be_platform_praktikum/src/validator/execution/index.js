const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const fileSchema = Joi.object({
  path: Joi.string().allow('', null),
  name: Joi.string().allow('', null),
  content: Joi.string().allow('').required(),
}).or('path', 'name');

const runMessageSchema = Joi.object({
  type: Joi.string().valid('run').required(),
  language: Joi.string().valid('java', 'python').required(),
  code: Joi.string().allow('', null),
  files: Joi.array().items(fileSchema).min(1).required(),
  mainClass: Joi.string().allow('', null),
  entryFile: Joi.string().allow('', null),
});

const inputMessageSchema = Joi.object({
  type: Joi.string().valid('input', 'stdin').required(),
  data: Joi.string().allow('', null),
  value: Joi.string().allow('', null),
});

const stopMessageSchema = Joi.object({
  type: Joi.string().valid('stop').required(),
});

module.exports = {
  validateRunMessage: (payload) => validateWithSchema(runMessageSchema, payload),
  validateInputMessage: (payload) => validateWithSchema(inputMessageSchema, payload),
  validateStopMessage: (payload) => validateWithSchema(stopMessageSchema, payload),
};
