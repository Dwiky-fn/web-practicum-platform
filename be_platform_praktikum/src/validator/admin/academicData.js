const Joi = require('joi');
const { validateWithSchema } = require('../utils');

const idSchema = Joi.string().trim().required();
const statusSchema = Joi.string().valid('active', 'inactive', 'archived');
const kelasPraktikumStatusSchema = Joi.string().valid('draft', 'open', 'closed', 'archived');

const tahunSemesterPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  tahun_semester: Joi.string().trim().required(),
  status: statusSchema.default('inactive'),
});

const updateTahunSemesterPayloadSchema = Joi.object({
  tahun_semester: Joi.string().trim(),
  status: statusSchema,
}).min(1);

const kurikulumPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  tahun_kurikulum: Joi.string().trim().required(),
  nama_kurikulum: Joi.string().trim().required(),
  status: statusSchema.default('inactive'),
});

const updateKurikulumPayloadSchema = Joi.object({
  tahun_kurikulum: Joi.string().trim(),
  nama_kurikulum: Joi.string().trim(),
  status: statusSchema,
}).min(1);

const semesterPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  semester: Joi.number().integer().min(1).max(14).required(),
});

const kelasPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  kelas: Joi.string().trim().required(),
});

function normalizeCourseType(val) {
  if (!val) return 'praktikum';
  const str = String(val).toLowerCase().trim();
  if (str === 'teori' || str === 't') return 'teori';
  if (str === 'praktikum' || str === 'p') return 'praktikum';
  if (str.includes('teori') && (str.includes('praktik') || str.includes('prak') || str.includes('&') || str.includes('dan') || str.includes('_') || str.includes('-'))) return 'teori_praktikum';
  if (str.includes('teori')) return 'teori';
  if (str.includes('praktik') || str.includes('prak')) return 'praktikum';
  return 'praktikum';
}

const courseTypeSchema = Joi.string()
  .custom((value) => normalizeCourseType(value))
  .default('praktikum');

const updateCourseTypeSchema = Joi.string()
  .custom((value) => normalizeCourseType(value));

const mataKuliahPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  kode_mk: Joi.string().trim().required(),
  nama_mk: Joi.string().trim().required(),
  sks: Joi.number().integer().min(1).max(8).required(),
  tipe: courseTypeSchema,
  id_kurikulum: idSchema,
  id_semester: idSchema,
});

const updateMataKuliahPayloadSchema = Joi.object({
  kode_mk: Joi.string().trim(),
  nama_mk: Joi.string().trim(),
  sks: Joi.number().integer().min(1).max(8),
  tipe: updateCourseTypeSchema,
  id_kurikulum: Joi.string().trim(),
  id_semester: Joi.string().trim(),
}).min(1);

const kelasMahasiswaPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  id_tahun_semester: idSchema,
  id_semester: idSchema,
  id_kelas: idSchema,
  id_mahasiswa: idSchema,
  status: Joi.string().valid('active', 'inactive', 'archived', 'cuti').default('active'),
});

const updateKelasMahasiswaPayloadSchema = Joi.object({
  id_tahun_semester: Joi.string().trim(),
  id_semester: Joi.string().trim(),
  id_kelas: Joi.string().trim(),
  id_mahasiswa: Joi.string().trim(),
  status: Joi.string().valid('active', 'inactive', 'archived', 'cuti'),
}).min(1);

const kelasPraktikumPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  id_tahun_semester: idSchema,
  id_kurikulum: Joi.string().trim().allow('', null),
  id_mata_kuliah: idSchema,
  id_semester: Joi.string().trim().allow('', null),
  id_kelas: idSchema,
  jumlah_jobsheet_rencana: Joi.number().integer().min(0).default(0),
  status: kelasPraktikumStatusSchema.default('draft'),
});

const updateKelasPraktikumPayloadSchema = Joi.object({
  id_tahun_semester: Joi.string().trim(),
  id_kurikulum: Joi.string().trim(),
  id_mata_kuliah: Joi.string().trim(),
  id_semester: Joi.string().trim(),
  id_kelas: Joi.string().trim(),
  jumlah_jobsheet_rencana: Joi.number().integer().min(0),
  status: kelasPraktikumStatusSchema,
}).min(1);

const pengampuPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  id_kelas_praktikum: idSchema,
  id_dosen: idSchema,
  peran: Joi.string().valid('utama', 'asisten', 'pengganti').default('utama'),
});

const updatePengampuPayloadSchema = Joi.object({
  id_kelas_praktikum: Joi.string().trim(),
  id_dosen: Joi.string().trim(),
  peran: Joi.string().valid('utama', 'asisten', 'pengganti'),
}).min(1);

const kelasMahasiswaQuerySchema = Joi.object({
  id_tahun_semester: Joi.string().allow('', null),
  id_semester: Joi.string().allow('', null),
  id_kelas: Joi.string().allow('', null),
  id_kelas_semester: Joi.string().allow('', null),
  keyword: Joi.string().allow('', null),
});

const kelasSemesterPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  id_tahun_semester: idSchema,
  id_semester: idSchema,
  id_kelas: idSchema,
  study_program_id: Joi.string().trim().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
});

const updateKelasSemesterPayloadSchema = Joi.object({
  id_tahun_semester: Joi.string().trim(),
  id_semester: Joi.string().trim(),
  id_kelas: Joi.string().trim(),
  study_program_id: Joi.string().trim().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'archived'),
}).min(1);

const studentTransitionPayloadSchema = Joi.object({
  sourceKelasSemesterId: idSchema,
  autoCreateTargets: Joi.array().items(
    Joi.object({
      placeholderKey: Joi.string().trim().required(),
      id_tahun_semester: Joi.string().trim().required(),
      id_semester: Joi.string().trim().required(),
      id_kelas: Joi.string().trim().required(),
    })
  ).optional().default([]),
  transitions: Joi.array().items(
    Joi.object({
      studentId: idSchema,
      targetKelasSemesterId: Joi.string().trim().required(),
    })
  ).min(1).required(),
});

module.exports = {
  validateTahunSemesterPayload: (payload) => validateWithSchema(tahunSemesterPayloadSchema, payload),
  validateUpdateTahunSemesterPayload: (payload) => validateWithSchema(updateTahunSemesterPayloadSchema, payload),
  validateKurikulumPayload: (payload) => validateWithSchema(kurikulumPayloadSchema, payload),
  validateUpdateKurikulumPayload: (payload) => validateWithSchema(updateKurikulumPayloadSchema, payload),
  validateSemesterPayload: (payload) => validateWithSchema(semesterPayloadSchema, payload),
  validateKelasPayload: (payload) => validateWithSchema(kelasPayloadSchema, payload),
  validateMataKuliahPayload: (payload) => validateWithSchema(mataKuliahPayloadSchema, payload),
  validateUpdateMataKuliahPayload: (payload) => validateWithSchema(updateMataKuliahPayloadSchema, payload),
  validateKelasMahasiswaPayload: (payload) => validateWithSchema(kelasMahasiswaPayloadSchema, payload),
  validateUpdateKelasMahasiswaPayload: (payload) => validateWithSchema(updateKelasMahasiswaPayloadSchema, payload),
  validateKelasPraktikumPayload: (payload) => validateWithSchema(kelasPraktikumPayloadSchema, payload),
  validateUpdateKelasPraktikumPayload: (payload) => validateWithSchema(updateKelasPraktikumPayloadSchema, payload),
  validatePengampuPayload: (payload) => validateWithSchema(pengampuPayloadSchema, payload),
  validateUpdatePengampuPayload: (payload) => validateWithSchema(updatePengampuPayloadSchema, payload),
  validateKelasMahasiswaQuery: (query) => validateWithSchema(kelasMahasiswaQuerySchema, query),
  validateKelasSemesterPayload: (payload) => validateWithSchema(kelasSemesterPayloadSchema, payload),
  validateUpdateKelasSemesterPayload: (payload) => validateWithSchema(updateKelasSemesterPayloadSchema, payload),
  validateStudentTransitionPayload: (payload) => validateWithSchema(studentTransitionPayloadSchema, payload),
};
