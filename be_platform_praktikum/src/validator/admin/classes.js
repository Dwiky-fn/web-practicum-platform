const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const statusSchema = Joi.string().valid(
  'Aktif',
  'Nonaktif',
  'Arsip',
  'AKTIF',
  'NONAKTIF',
  'ARSIP',
  'aktif',
  'nonaktif',
  'arsip',
);

const classesQuerySchema = Joi.object({
  keyword: Joi.string().allow('', null),
  status: Joi.string().allow('', null),
  courseId: Joi.string().allow('', null),
  lecturerId: Joi.string().allow('', null),
});

const classPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  courseId: Joi.string().allow('', null),
  course_id: Joi.string().allow('', null),
  lecturerId: Joi.string().allow('', null),
  lecturer_id: Joi.string().allow('', null),
  name: Joi.string().trim().allow('', null),
  className: Joi.string().trim().allow('', null),
  class_name: Joi.string().trim().allow('', null),
  rombel: Joi.string().trim().allow('', null),
  status: statusSchema.default('Aktif'),
  programmingLanguage: Joi.string().valid('java', 'python').default('java'),
  programming_language: Joi.string().valid('java', 'python').default('java'),
}).custom((value, helpers) => {
  if (!value.courseId && !value.course_id) {
    return helpers.error('any.custom', { message: 'Mata kuliah wajib dipilih' });
  }

  if (!value.lecturerId && !value.lecturer_id) {
    return helpers.error('any.custom', { message: 'Dosen pengampu wajib dipilih' });
  }

  if (!value.name && !value.className && !value.class_name && !value.rombel) {
    return helpers.error('any.custom', { message: 'Kelas/Rombel wajib diisi' });
  }

  return value;
}).messages({
  'any.custom': '{{#message}}',
});

const updateClassPayloadSchema = Joi.object({
  courseId: Joi.string().allow('', null),
  course_id: Joi.string().allow('', null),
  lecturerId: Joi.string().allow('', null),
  lecturer_id: Joi.string().allow('', null),
  name: Joi.string().trim().allow('', null),
  className: Joi.string().trim().allow('', null),
  class_name: Joi.string().trim().allow('', null),
  rombel: Joi.string().trim().allow('', null),
  status: statusSchema.required(),
  programmingLanguage: Joi.string().valid('java', 'python').default('java'),
  programming_language: Joi.string().valid('java', 'python').default('java'),
}).custom((value, helpers) => {
  if (!value.lecturerId && !value.lecturer_id) {
    return helpers.error('any.custom', { message: 'Dosen pengampu wajib dipilih' });
  }

  return value;
}).messages({
  'any.custom': '{{#message}}',
});

const assignStudentsPayloadSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().required()).min(1).required(),
});

const cloneClassPayloadSchema = Joi.object({
  source_class_id: Joi.string().required(),
  name: Joi.string().trim().required(),
  academic_period_id: Joi.string().allow('', null),
  academicPeriodId: Joi.string().allow('', null),
  academic_year: Joi.string().trim().allow('', null),
  semester: Joi.string().valid('Ganjil', 'Genap', 'ganjil', 'genap', 'GANJIL', 'GENAP').allow('', null),
  study_program_id: Joi.when('auto_enroll_students', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null),
  }),
  generation: Joi.when('auto_enroll_students', {
    is: true,
    then: Joi.number().integer().required(),
    otherwise: Joi.number().integer().allow(null),
  }),
  class_name: Joi.string().allow('', null),
  lecturer_id: Joi.string().allow('', null),
  programming_language: Joi.string().valid('java', 'python').default('java'),
  copy_jobsheets: Joi.boolean().default(true),
  auto_enroll_students: Joi.boolean().default(false),
});

const getClassTemplatesQuerySchema = Joi.object({
  semester: Joi.string().valid('Ganjil', 'Genap', 'ganjil', 'genap', 'GANJIL', 'GENAP').required(),
  keyword: Joi.string().allow('', null),
});

const assignClassSemesterPayloadSchema = Joi.object({
  kelasSemesterId: Joi.string().required(),
});

module.exports = {
  validateClassesQuery: (query) => validateWithSchema(classesQuerySchema, query),
  validateCreateClassPayload: (payload) => validateWithSchema(classPayloadSchema, payload),
  validateUpdateClassPayload: (payload) => validateWithSchema(updateClassPayloadSchema, payload),
  validateAssignStudentsPayload: (payload) => validateWithSchema(assignStudentsPayloadSchema, payload),
  validateCloneClassPayload: (payload) => validateWithSchema(cloneClassPayloadSchema, payload),
  validateGetClassTemplatesQuery: (query) => validateWithSchema(getClassTemplatesQuerySchema, query),
  validateAssignClassSemesterPayload: (payload) => validateWithSchema(assignClassSemesterPayloadSchema, payload),
};
