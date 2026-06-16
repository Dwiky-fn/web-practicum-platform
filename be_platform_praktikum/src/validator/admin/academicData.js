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

const mataKuliahPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  kode_mk: Joi.string().trim().required(),
  nama_mk: Joi.string().trim().required(),
  sks: Joi.number().integer().min(1).max(8).required(),
  tipe: Joi.string().valid('teori', 'praktikum', 'teori_praktikum').default('praktikum'),
  id_kurikulum: idSchema,
  id_semester: idSchema,
});

const updateMataKuliahPayloadSchema = Joi.object({
  kode_mk: Joi.string().trim(),
  nama_mk: Joi.string().trim(),
  sks: Joi.number().integer().min(1).max(8),
  tipe: Joi.string().valid('teori', 'praktikum', 'teori_praktikum'),
  id_kurikulum: Joi.string().trim(),
  id_semester: Joi.string().trim(),
}).min(1);

const legacyCourseCandidatesQuerySchema = Joi.object({
  keyword: Joi.string().allow('', null),
  status: Joi.string().valid('all', 'linked', 'unlinked').default('all'),
});

const linkLegacyCoursePayloadSchema = Joi.object({
  legacy_course_id: Joi.string().trim(),
  course_id: Joi.string().trim(),
  courseId: Joi.string().trim(),
}).or('legacy_course_id', 'course_id', 'courseId');

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
  id_mata_kuliah: idSchema,
  id_semester: Joi.string().trim().allow('', null),
  id_kelas: idSchema,
  status: kelasPraktikumStatusSchema.default('draft'),
});

const updateKelasPraktikumPayloadSchema = Joi.object({
  id_tahun_semester: Joi.string().trim(),
  id_mata_kuliah: Joi.string().trim(),
  id_semester: Joi.string().trim(),
  id_kelas: Joi.string().trim(),
  status: kelasPraktikumStatusSchema,
}).min(1);

const linkLegacyClassPayloadSchema = Joi.object({
  legacy_class_id: Joi.string().trim(),
  class_id: Joi.string().trim(),
  classId: Joi.string().trim(),
}).or('legacy_class_id', 'class_id', 'classId');

const legacyClassCandidatesQuerySchema = Joi.object({
  keyword: Joi.string().allow('', null),
  status: Joi.string().valid('all', 'linked', 'unlinked').default('all'),
});

const bulkLinkLegacyClassesPayloadSchema = Joi.object({
  links: Joi.array().items(
    Joi.object({
      id_kelas_praktikum: Joi.string().trim(),
      kelas_praktikum_id: Joi.string().trim(),
      kelasPraktikumId: Joi.string().trim(),
      legacy_class_id: Joi.string().trim(),
      class_id: Joi.string().trim(),
      classId: Joi.string().trim(),
    })
      .or('id_kelas_praktikum', 'kelas_praktikum_id', 'kelasPraktikumId')
      .or('legacy_class_id', 'class_id', 'classId'),
  ).min(1).required(),
});

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
  keyword: Joi.string().allow('', null),
});

const kelasSemesterPayloadSchema = Joi.object({
  id: Joi.string().allow('', null),
  id_tahun_semester: idSchema,
  id_semester: idSchema,
  id_kelas: idSchema,
  status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
});

const updateKelasSemesterPayloadSchema = Joi.object({
  id_tahun_semester: Joi.string().trim(),
  id_semester: Joi.string().trim(),
  id_kelas: Joi.string().trim(),
  status: Joi.string().valid('active', 'inactive', 'archived'),
}).min(1);

module.exports = {
  validateTahunSemesterPayload: (payload) => validateWithSchema(tahunSemesterPayloadSchema, payload),
  validateUpdateTahunSemesterPayload: (payload) => validateWithSchema(updateTahunSemesterPayloadSchema, payload),
  validateKurikulumPayload: (payload) => validateWithSchema(kurikulumPayloadSchema, payload),
  validateUpdateKurikulumPayload: (payload) => validateWithSchema(updateKurikulumPayloadSchema, payload),
  validateSemesterPayload: (payload) => validateWithSchema(semesterPayloadSchema, payload),
  validateKelasPayload: (payload) => validateWithSchema(kelasPayloadSchema, payload),
  validateMataKuliahPayload: (payload) => validateWithSchema(mataKuliahPayloadSchema, payload),
  validateUpdateMataKuliahPayload: (payload) => validateWithSchema(updateMataKuliahPayloadSchema, payload),
  validateLegacyCourseCandidatesQuery: (query) => validateWithSchema(legacyCourseCandidatesQuerySchema, query),
  validateLinkLegacyCoursePayload: (payload) => validateWithSchema(linkLegacyCoursePayloadSchema, payload),
  validateKelasMahasiswaPayload: (payload) => validateWithSchema(kelasMahasiswaPayloadSchema, payload),
  validateUpdateKelasMahasiswaPayload: (payload) => validateWithSchema(updateKelasMahasiswaPayloadSchema, payload),
  validateKelasPraktikumPayload: (payload) => validateWithSchema(kelasPraktikumPayloadSchema, payload),
  validateUpdateKelasPraktikumPayload: (payload) => validateWithSchema(updateKelasPraktikumPayloadSchema, payload),
  validateLinkLegacyClassPayload: (payload) => validateWithSchema(linkLegacyClassPayloadSchema, payload),
  validateLegacyClassCandidatesQuery: (query) => validateWithSchema(legacyClassCandidatesQuerySchema, query),
  validateBulkLinkLegacyClassesPayload: (payload) => validateWithSchema(bulkLinkLegacyClassesPayloadSchema, payload),
  validatePengampuPayload: (payload) => validateWithSchema(pengampuPayloadSchema, payload),
  validateUpdatePengampuPayload: (payload) => validateWithSchema(updatePengampuPayloadSchema, payload),
  validateKelasMahasiswaQuery: (query) => validateWithSchema(kelasMahasiswaQuerySchema, query),
  validateKelasSemesterPayload: (payload) => validateWithSchema(kelasSemesterPayloadSchema, payload),
  validateUpdateKelasSemesterPayload: (payload) => validateWithSchema(updateKelasSemesterPayloadSchema, payload),
};
