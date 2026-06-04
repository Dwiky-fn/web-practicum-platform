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
    CLASS_NOT_FOUND: [404, 'Kelas tidak ditemukan'],
    SEMESTER_NOT_FOUND: [404, 'Semester tidak ditemukan'],
    ACTIVE_SEMESTER_NOT_FOUND: [400, 'Belum ada semester aktif'],
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
