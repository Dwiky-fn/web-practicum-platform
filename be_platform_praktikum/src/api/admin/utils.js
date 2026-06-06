function ok(res, data, message) {
  return res.status(200).json({ status: 'success', message, data });
}

function created(res, data, message) {
  return res.status(201).json({ status: 'success', message, data });
}

function handleAdminError(error, res) {
  const errors = {
    USER_NOT_FOUND: [404, 'User tidak ditemukan'],
    USER_DUPLICATE: [409, 'Email, NIM, atau NIP sudah digunakan'],
    USER_HAS_CLASSES: [409, 'Dosen masih menjadi pengampu kelas'],
    CLASS_NOT_FOUND: [404, 'Kelas tidak ditemukan'],
    CLASS_DUPLICATE: [409, 'Kelas pada mata kuliah dan semester aktif ini sudah ada'],
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
    COURSE_ACCESS_DENIED: [403, 'Dosen tidak memiliki akses ke mata kuliah ini'],
    CLASS_ACCESS_DENIED: [403, 'Dosen tidak memiliki akses ke kelas ini'],
    JOBSHEET_NOT_FOUND: [404, 'Jobsheet tidak ditemukan'],
    SUBMISSION_NOT_FOUND: [404, 'Submission tidak ditemukan'],
  };
  const detail = errors[error.message];

  if (detail) {
    const [statusCode, message] = detail;
    return res.status(statusCode).json({ status: 'fail', message });
  }

  console.error(error);
  return res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan server',
  });
}

module.exports = {
  created,
  handleAdminError,
  ok,
};
