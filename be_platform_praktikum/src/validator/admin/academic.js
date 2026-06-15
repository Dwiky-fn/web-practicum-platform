const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const termSchema = Joi.string().valid('Ganjil', 'Genap', 'ganjil', 'genap', 'GANJIL', 'GENAP');
const statusSchema = Joi.string().valid('Aktif', 'Nonaktif', 'AKTIF', 'NONAKTIF', 'aktif', 'nonaktif');

const createSemesterPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  year: Joi.string().trim().required(),
  term: termSchema.when('semester', {
    is: Joi.exist(),
    then: Joi.optional().allow('', null),
    otherwise: Joi.required(),
  }),
  semester: termSchema.allow('', null),
  status: statusSchema.default('Nonaktif'),
});

const coursePayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  code: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  semester: Joi.number().integer().min(1).max(8).required(),
  sks: Joi.number().integer().min(1).max(6).required(),
  status: statusSchema.default('Aktif'),
});

const updateCoursePayloadSchema = Joi.object({
  code: Joi.string().trim(),
  name: Joi.string().trim(),
  semester: Joi.number().integer().min(1).max(8),
  sks: Joi.number().integer().min(1).max(6),
  status: statusSchema,
}).min(1);

const coursesQuerySchema = Joi.object({
  keyword: Joi.string().allow('', null),
  semester: Joi.alternatives().try(
    Joi.string().valid('all').allow('', null),
    Joi.number().integer().min(1).max(8),
  ),
});

module.exports = {
  validateCreateSemesterPayload: (payload) => validateWithSchema(createSemesterPayloadSchema, payload),
  validateCreateCoursePayload: (payload) => validateWithSchema(coursePayloadSchema, payload),
  validateUpdateCoursePayload: (payload) => validateWithSchema(updateCoursePayloadSchema, payload),
  validateCoursesQuery: (query) => validateWithSchema(coursesQuerySchema, query),
};
