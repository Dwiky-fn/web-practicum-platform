function ok(res, data, message) {
  return res.status(200).json({ status: 'success', message, data });
}

function created(res, data, message) {
  return res.status(201).json({ status: 'success', message, data });
}

function handleAdminError(error, res) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      status: 'fail',
      message: error.message,
    });
  }

  const errors = {
    USER_NOT_FOUND: [404, 'User tidak ditemukan'],
    USER_DUPLICATE: [409, 'Email, NIM, atau NIP sudah digunakan'],
    USER_HAS_CLASSES: [409, 'Dosen masih menjadi pengampu kelas'],
    CLASS_NOT_FOUND: [404, 'Kelas tidak ditemukan'],
    STUDENT_NOT_FOUND_IN_CLASS: [404, 'Mahasiswa tidak ditemukan di kelas ini'],
    CLASS_DUPLICATE: [409, 'Kelas pada mata kuliah dan semester aktif ini sudah ada'],
    CLONE_SOURCE_CLASS_NOT_FOUND: [404, 'Kelas sumber tidak ditemukan'],
    CLONE_ACADEMIC_PERIOD_NOT_FOUND: [404, 'Semester akademik tujuan tidak ditemukan'],
    CLONE_STUDY_PROGRAM_REQUIRED: [400, 'Program studi wajib dipilih untuk auto enroll mahasiswa'],
    CLONE_GENERATION_REQUIRED: [400, 'Angkatan wajib diisi untuk auto enroll mahasiswa'],
    COURSE_NOT_FOUND: [404, 'Mata kuliah tidak ditemukan'],
    COURSE_DUPLICATE: [409, 'Kode atau nama mata kuliah pada semester tersebut sudah ada'],
    COURSE_HAS_CLASSES: [409, 'Mata kuliah masih digunakan pada kelas'],
    COURSE_INACTIVE: [409, 'Mata kuliah tidak aktif pada semester akademik aktif'],
    SEMESTER_NOT_FOUND: [404, 'Semester tidak ditemukan'],
    SEMESTER_DUPLICATE: [409, 'Semester akademik tersebut sudah ada'],
    SEMESTER_ACTIVE_DELETE: [409, 'Semester aktif tidak dapat dihapus'],
    SEMESTER_HAS_CLASSES: [409, 'Semester masih digunakan pada kelas'],
    ACTIVE_SEMESTER_NOT_FOUND: [400, 'Belum ada semester aktif'],
    LECTURER_REQUIRED: [400, 'Dosen pengampu wajib dipilih'],
    STATUS_REQUIRED: [400, 'Status kelas wajib dipilih'],
    CLASS_STATUS_INVALID: [400, 'Status kelas tidak valid'],
    PROGRAMMING_LANGUAGE_INVALID: [400, 'Bahasa pemrograman tidak valid'],
    COURSE_ACCESS_DENIED: [403, 'Dosen tidak memiliki akses ke mata kuliah ini'],
    CLASS_ACCESS_DENIED: [403, 'Dosen tidak memiliki akses ke kelas ini'],
    JOBSHEET_NOT_FOUND: [404, 'Jobsheet tidak ditemukan'],
    SUBMISSION_NOT_FOUND: [404, 'Submission tidak ditemukan'],
    STUDENT_SEMESTER_MISMATCH: [400, 'Semester mahasiswa tidak sesuai dengan semester mata kuliah'],
    STUDENT_ALREADY_IN_COURSE_CLASS: [409, 'Mahasiswa sudah terdaftar di kelas lain pada mata kuliah ini'],
    TAHUN_SEMESTER_NOT_FOUND: [404, 'Tahun semester tidak ditemukan'],
    TAHUN_SEMESTER_DUPLICATE: [409, 'Tahun semester sudah ada atau semester aktif sudah tersedia'],
    TAHUN_SEMESTER_USED: [409, 'Tahun semester masih digunakan oleh data akademik lain'],
    KURIKULUM_NOT_FOUND: [404, 'Kurikulum tidak ditemukan'],
    KURIKULUM_DUPLICATE: [409, 'Kurikulum sudah ada atau kurikulum aktif sudah tersedia'],
    KURIKULUM_USED: [409, 'Kurikulum masih digunakan oleh mata kuliah'],
    MASTER_SEMESTER_NOT_FOUND: [404, 'Master semester tidak ditemukan'],
    MASTER_SEMESTER_DUPLICATE: [409, 'Master semester sudah ada'],
    MASTER_SEMESTER_USED: [409, 'Master semester masih digunakan oleh data akademik lain'],
    MASTER_KELAS_NOT_FOUND: [404, 'Master kelas tidak ditemukan'],
    MASTER_KELAS_DUPLICATE: [409, 'Master kelas sudah ada'],
    MASTER_KELAS_USED: [409, 'Master kelas masih digunakan oleh data akademik lain'],
    MATA_KULIAH_NOT_FOUND: [404, 'Mata kuliah tidak ditemukan'],
    MATA_KULIAH_DUPLICATE: [409, 'Kode mata kuliah pada kurikulum tersebut sudah ada'],
    MATA_KULIAH_LEGACY_COURSE_DUPLICATE: [409, 'Course lama tersebut sudah terhubung ke mata kuliah lain'],
    MATA_KULIAH_USED: [409, 'Mata kuliah masih digunakan oleh kelas praktikum'],
    MAHASISWA_NOT_FOUND: [404, 'Mahasiswa tidak ditemukan'],
    DOSEN_NOT_FOUND: [404, 'Dosen tidak ditemukan'],
    KELAS_MAHASISWA_NOT_FOUND: [404, 'Kelas mahasiswa tidak ditemukan'],
    KELAS_MAHASISWA_DUPLICATE: [409, 'Mahasiswa sudah tercatat pada tahun semester tersebut'],
    KELAS_MAHASISWA_USED: [409, 'Kelas mahasiswa masih terkait progress atau submission'],
    KELAS_PRAKTIKUM_NOT_FOUND: [404, 'Kelas praktikum tidak ditemukan'],
    KELAS_PRAKTIKUM_REFERENCE_NOT_FOUND: [404, 'Relasi tahun semester, mata kuliah, semester, atau kelas tidak ditemukan'],
    KELAS_PRAKTIKUM_DUPLICATE: [409, 'Kelas praktikum dengan kombinasi tersebut sudah ada'],
    KELAS_PRAKTIKUM_LEGACY_CLASS_DUPLICATE: [409, 'Kelas lama tersebut sudah terhubung ke kelas praktikum lain'],
    KELAS_PRAKTIKUM_USED: [409, 'Kelas praktikum masih terkait pengampu, jobsheet, progress, atau submission'],
    PENGAMPU_NOT_FOUND: [404, 'Pengampu tidak ditemukan'],
    PENGAMPU_DUPLICATE: [409, 'Dosen sudah menjadi pengampu pada kelas praktikum tersebut'],
  };
  const detail = errors[error.message];

  if (detail) {
    const [statusCode, message] = detail;
    return res.status(statusCode).json({ status: 'fail', message });
  }

  console.error(error);
  return res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan pada server',
  });
}

module.exports = {
  created,
  handleAdminError,
  ok,
};
