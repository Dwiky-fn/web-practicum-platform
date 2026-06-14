const Joi = require('joi');

const cloneClassPayloadSchema = Joi.object({
  source_class_id: Joi.string().required(),
  name: Joi.string().trim().required(),
  academic_period_id: Joi.string().allow('', null),
  academicPeriodId: Joi.string().allow('', null),
  academic_year: Joi.string().trim().allow('', null),
  semester: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
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
  copy_jobsheets: Joi.boolean().default(true),
  auto_enroll_students: Joi.boolean().default(false),
});

module.exports = {
  validateCloneClassPayload: (payload) => cloneClassPayloadSchema.validate(payload),
};
