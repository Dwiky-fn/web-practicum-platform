const Joi = require('joi');
const { validateWithSchema } = require('../utils');
const statusSchema = Joi.string().valid('Aktif', 'Nonaktif', 'Cuti', 'AKTIF', 'NONAKTIF', 'CUTI', 'aktif', 'nonaktif', 'cuti');
const baseUserPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  fullname: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).allow('', null),
  status: statusSchema.default('Aktif'),
  programStudi: Joi.string().trim().allow('', null),
  program_studi: Joi.string().trim().allow('', null),
  jurusan: Joi.string().trim().allow('', null),
});

const createStudentPayloadSchema = baseUserPayloadSchema.keys({
  nim: Joi.string().trim().required(),
  angkatan: Joi.number().integer().min(2000).max(2100).allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  studyProgramId: Joi.string().allow('', null),
  study_program_id: Joi.string().allow('', null),
});

const createLecturerPayloadSchema = baseUserPayloadSchema.keys({
  nip: Joi.string().trim().required(),
});

const updateUserPayloadSchema = Joi.object({
  fullname: Joi.string().trim().min(2).max(150),
  email: Joi.string().email(),
  password: Joi.string().min(6).allow('', null),
  status: statusSchema,
  nim: Joi.string().trim().allow('', null),
  nip: Joi.string().trim().allow('', null),
  angkatan: Joi.number().integer().min(2000).max(2100).allow(null),
  semester: Joi.number().integer().min(1).max(14).allow(null),
  programStudi: Joi.string().trim().allow('', null),
  program_studi: Joi.string().trim().allow('', null),
  jurusan: Joi.string().trim().allow('', null),
  studyProgramId: Joi.string().allow('', null),
  study_program_id: Joi.string().allow('', null),
}).min(1);

const usersQuerySchema = Joi.object({
  role: Joi.string().valid('students', 'lecturers', 'MAHASISWA', 'DOSEN').allow('', null),
  keyword: Joi.string().allow('', null),
  semester: Joi.alternatives().try(
    Joi.string().valid('all').allow('', null),
    Joi.number().integer().min(1).max(14),
  ),
});

module.exports = {
  validateCreateStudentPayload: (payload) => validateWithSchema(createStudentPayloadSchema, payload),
  validateCreateLecturerPayload: (payload) => validateWithSchema(createLecturerPayloadSchema, payload),
  validateUpdateUserPayload: (payload) => validateWithSchema(updateUserPayloadSchema, payload),
  validateUsersQuery: (query) => validateWithSchema(usersQuerySchema, query),
};
