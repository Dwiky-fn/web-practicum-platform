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
    STUDY_PROGRAM_NOT_FOUND: [404, 'Program Studi tidak ditemukan'],
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
    JOBSHEET_USED_BY_CLASS: [409, 'Jobsheet tidak dapat dihapus karena sudah digunakan di kelas.'],
    JOBSHEET_HAS_WORK_DATA: [409, 'Jobsheet tidak dapat dihapus karena sudah memiliki data pengerjaan mahasiswa.'],
    JOBSHEET_PLAN_MIN_INVALID: [400, 'Jumlah jobsheet rencana minimal 1.'],
    JOBSHEET_PLAN_BELOW_CREATED: [400, 'Jumlah jobsheet rencana tidak boleh lebih kecil dari jumlah jobsheet yang sudah dibuat.'],
    JOBSHEET_SEQUENCE_REQUIRED: [400, 'Urutan jobsheet wajib diisi.'],
    JOBSHEET_SEQUENCE_INVALID: [400, 'Urutan jobsheet tidak valid.'],
    JOBSHEET_SEQUENCE_DUPLICATE: [409, 'Urutan jobsheet sudah digunakan pada kelas praktikum ini.'],
    JOBSHEET_SEQUENCE_EXCEEDS_PLAN: [400, 'Urutan jobsheet tidak boleh melebihi jumlah jobsheet rencana.'],
    JOBSHEET_NOT_PUBLISHED: [403, 'Jobsheet belum dipublish.'],
    JOBSHEET_PREVIOUS_NOT_COMPLETED: [403, 'Selesaikan jobsheet sebelumnya terlebih dahulu.'],
    'Tambahkan minimal satu dasar teori, percobaan, atau latihan sebelum publish.': [400, 'Tambahkan minimal satu dasar teori, percobaan, atau latihan sebelum publish.'],
    'Total bobot harus 100% sebelum publish.': [400, 'Total bobot harus 100% sebelum publish.'],
    'Bobot penilaian tidak boleh bernilai negatif.': [400, 'Bobot penilaian tidak boleh bernilai negatif.'],
    SUBMISSION_NOT_FOUND: [404, 'Submission tidak ditemukan'],
    STUDENT_SEMESTER_MISMATCH: [400, 'Semester mahasiswa tidak sesuai dengan semester mata kuliah'],
    STUDENT_ALREADY_IN_COURSE_CLASS: [409, 'Mahasiswa sudah terdaftar di kelas lain pada mata kuliah ini'],
    TAHUN_SEMESTER_NOT_FOUND: [404, 'Tahun semester tidak ditemukan'],
    TAHUN_SEMESTER_TARGET_NOT_FOUND: [400, 'Tahun semester target belum tersedia. Buat tahun semester target terlebih dahulu.'],
    TAHUN_SEMESTER_FORMAT_INVALID: [400, 'Format tahun semester tidak valid'],
    TAHUN_SEMESTER_SOURCE_NOT_ACTIVE: [400, 'Kenaikan semester hanya dapat difinalisasi dari tahun semester aktif'],
    TAHUN_SEMESTER_TARGET_ALREADY_ACTIVE: [400, 'Tahun semester target sudah aktif'],
    TAHUN_SEMESTER_ACTIVATION_REQUIRES_PROMOTION: [400, 'Tahun semester berikutnya harus diaktifkan melalui finalisasi kenaikan semester'],
    TAHUN_SEMESTER_MANUAL_ACTIVATION_DISABLED: [400, 'Aktivasi Tahun Semester hanya dapat dilakukan melalui Finalisasi Kenaikan Semester.'],
    TAHUN_SEMESTER_INITIAL_ACTIVATION_LOCKED: [400, 'Aktivasi awal hanya dapat digunakan jika belum ada Tahun Semester aktif.'],
    TAHUN_SEMESTER_REQUIRED: [400, 'Tahun semester wajib diisi'],
    TAHUN_SEMESTER_DUPLICATE: [409, 'Tahun semester tersebut sudah terdaftar'],
    TAHUN_SEMESTER_USED: [409, 'Tahun semester masih digunakan oleh data akademik lain'],
    KURIKULUM_NOT_FOUND: [404, 'Kurikulum tidak ditemukan'],
    KURIKULUM_DUPLICATE: [409, 'Kurikulum sudah ada'],
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
    MAHASISWA_NOT_ACTIVE: [400, 'Mahasiswa harus berstatus Aktif untuk diproses'],
    DOSEN_NOT_FOUND: [404, 'Dosen tidak ditemukan'],
    KELAS_MAHASISWA_NOT_FOUND: [404, 'Kelas mahasiswa tidak ditemukan'],
    KELAS_MAHASISWA_DUPLICATE: [409, 'Mahasiswa sudah tercatat pada tahun semester tersebut'],
    KELAS_MAHASISWA_USED: [409, 'Kelas mahasiswa masih terkait progress atau submission'],
    KELAS_SEMESTER_NOT_FOUND: [404, 'Kelas semester tidak ditemukan'],
    KELAS_SEMESTER_TARGET_NOT_FOUND: [400, 'Kelas tujuan pada semester berikutnya belum tersedia. Silakan buat kelas tujuan terlebih dahulu.'],
    KELAS_SEMESTER_STUDY_PROGRAM_MISMATCH: [400, 'Kelas tujuan tidak sesuai dengan Program Studi mahasiswa'],
    KELAS_SEMESTER_STUDY_PROGRAM_REQUIRED: [400, 'Program Studi kelas semester wajib tersedia untuk validasi target kelas'],
    KELAS_SEMESTER_DUPLICATE: [409, 'Kelas semester sudah terdaftar pada tahun semester ini'],
    KELAS_SEMESTER_USED: [409, 'Kelas tidak dapat dihapus karena masih memiliki mahasiswa.'],
    KELAS_SEMESTER_HAS_STUDENTS: [409, 'Kelas tidak dapat diubah karena sudah memiliki mahasiswa.'],
    KELAS_SEMESTER_EDIT_USED_BY_PRAKTIKUM: [409, 'Kelas tidak dapat diubah karena sudah digunakan oleh kelas praktikum.'],
    KELAS_SEMESTER_DELETE_USED_BY_PRAKTIKUM: [409, 'Kelas tidak dapat dihapus karena sudah digunakan oleh kelas praktikum.'],
    KELAS_PRAKTIKUM_NOT_FOUND: [404, 'Kelas praktikum tidak ditemukan'],
    KELAS_PRAKTIKUM_REFERENCE_NOT_FOUND: [404, 'Relasi tahun semester, mata kuliah, semester, atau kelas tidak ditemukan'],
    KELAS_PRAKTIKUM_DUPLICATE: [409, 'Kelas praktikum dengan kombinasi tersebut sudah ada'],
    KELAS_PRAKTIKUM_LEGACY_CLASS_DUPLICATE: [409, 'Kelas lama tersebut sudah terhubung ke kelas praktikum lain'],
    KELAS_PRAKTIKUM_USED: [409, 'Kelas praktikum tidak dapat dihapus karena sudah memiliki jobsheet, progress, atau submission'],
    PENGAMPU_NOT_FOUND: [404, 'Pengampu tidak ditemukan'],
    PENGAMPU_DUPLICATE: [409, 'Dosen sudah menjadi pengampu pada kelas praktikum tersebut'],
    STUDENT_HISTORY_REQUIRED: [400, 'Mahasiswa belum memiliki riwayat kelas yang valid'],
    STUDENT_PROMOTION_TARGET_REQUIRED: [400, 'Semester dan kelas tujuan wajib dipilih'],
    STUDENT_PROMOTION_SEMESTER_INVALID: [400, 'Mahasiswa hanya dapat dinaikkan tepat satu semester.'],
    PROMOTION_DECISION_INCOMPLETE: [400, 'Masih ada mahasiswa aktif yang belum memiliki keputusan kenaikan semester'],
    PROMOTION_SKIP_REASON_REQUIRED: [400, 'Alasan wajib diisi untuk mahasiswa aktif yang tidak dinaikkan semester.'],
    SEMESTER_PROMOTION_ALREADY_FINALIZED: [409, 'Kenaikan semester untuk tahun semester ini sudah pernah difinalisasi.'],
    SEMESTER_PROMOTION_CONCURRENT: [409, 'Kenaikan semester sedang atau sudah diproses oleh admin lain. Muat ulang data sebelum mencoba lagi.'],
    KELAS_PRAKTIKUM_KURIKULUM_MISMATCH: [400, 'Mata kuliah tidak sesuai dengan kurikulum yang dipilih'],
    KELAS_PRAKTIKUM_SEMESTER_MISMATCH: [400, 'Mata kuliah tidak sesuai dengan semester kelas praktikum'],
    KELAS_PRAKTIKUM_MAHASISWA_CLASS_REQUIRED: [400, 'Kelas praktikum hanya dapat dibuat untuk Kelas Mahasiswa (Rombel) yang sudah terdaftar pada tahun semester ini.'],
  };
  const detail = errors[error.message];

  if (detail) {
    const [statusCode, message] = detail;
    return res.status(statusCode).json({ status: 'fail', message, code: error.message });
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
