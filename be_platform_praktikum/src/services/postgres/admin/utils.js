const crypto = require('crypto');

const normalizeStatus = (value, fallback = 'AKTIF') => {
  if (value === 'Aktif') return 'AKTIF';
  if (value === 'Nonaktif') return 'NONAKTIF';
  if (value === 'Cuti') return 'CUTI';
  if (value === 'Selesai') return 'SELESAI';
  if (value === 'Draft') return 'DRAFT';
  if (value === 'Arsip') return 'ARSIP';
  return (value || fallback).toUpperCase();
};

const displayStatus = (value) => {
  const map = {
    AKTIF: 'Aktif',
    NONAKTIF: 'Nonaktif',
    CUTI: 'Cuti',
    SELESAI: 'Selesai',
    DRAFT: 'Draft',
    ARSIP: 'Arsip',
    PUBLISHED: 'Aktif',
    UNPUBLISHED: 'Nonaktif',
    ARCHIVED: 'Arsip',
  };

  return map[value] || value || 'Nonaktif';
};

const displayTerm = (value) => value === 'GANJIL' ? 'Ganjil' : 'Genap';
const dbTerm = (value) => value === 'Ganjil' ? 'GANJIL' : 'GENAP';

const createId = (prefix) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`;

const normalizeProgrammingLanguage = (value, fallback = 'java') => {
  const normalized = String(value || fallback).toLowerCase();
  return ['java', 'python'].includes(normalized) ? normalized : fallback;
};

const displayProgrammingLanguage = (value) => {
  const normalized = normalizeProgrammingLanguage(value);
  return normalized === 'python' ? 'Python' : 'Java';
};

const mapStudent = (row) => ({
  id: row.id,
  nim: row.nim || '',
  fullname: row.fullname,
  email: row.email,
  angkatan: row.angkatan || 0,
  semester: row.semester || 0,
  status: (row.status === 'CUTI' || row.status === 'Cuti') ? 'Cuti' : (row.is_active ? displayStatus(normalizeStatus(row.status)) : 'Nonaktif'),
  programStudi: row.program_studi || 'Teknik Informatika',
  jurusan: row.jurusan || 'Teknologi Informasi',
  studyProgramId: row.study_program_id || undefined,
  avatarUrl: row.avatar_url || undefined,
});

const mapLecturer = (row) => ({
  id: row.id,
  nip: row.nip || '',
  fullname: row.fullname,
  email: row.email,
  status: row.is_active ? displayStatus(normalizeStatus(row.status)) : 'Nonaktif',
  programStudi: row.program_studi || 'Teknik Informatika',
  jurusan: row.jurusan || 'Teknologi Informasi',
  phone: row.no_telepon || '',
  birthInfo: [row.tempat_lahir, row.tanggal_lahir].filter(Boolean).join(', '),
  gender: '-',
  city: row.kota || '',
  avatarUrl: row.avatar_url || undefined,
});

const mapClass = (row) => ({
  id: row.id,
  name: row.name?.replace(/^Kelas\s+/i, '') || row.name,
  courseName: row.course_name,
  courseId: row.course_id,
  lecturerId: row.lecturer_id,
  lecturer: row.lecturer,
  academicPeriodId: row.academic_period_id,
  kelasPraktikumId: row.id_kelas_praktikum || undefined,
  id_kelas_praktikum: row.id_kelas_praktikum || undefined,
  namaKelasPraktikum: row.nama_kelas_praktikum || undefined,
  nama_kelas_praktikum: row.nama_kelas_praktikum || undefined,
  legacyClassLinked: Boolean(row.id_kelas_praktikum),
  semesterYear: `${row.year} - ${displayTerm(row.semester_type)}`,
  studentSemester: row.student_semester,
  programmingLanguage: normalizeProgrammingLanguage(row.programming_language),
  programmingLanguageDisplayName: displayProgrammingLanguage(row.programming_language),
  status: displayStatus(row.status),
});

module.exports = {
  createId,
  dbTerm,
  displayProgrammingLanguage,
  displayStatus,
  displayTerm,
  mapClass,
  mapLecturer,
  mapStudent,
  normalizeProgrammingLanguage,
  normalizeStatus,
};
