const test = require('node:test');
const assert = require('node:assert/strict');

const LecturerJobsheetsService = require('../src/services/postgres/lecturer/JobsheetsService');
const StudentJobsheetsService = require('../src/services/postgres/student/JobsheetsService');
const AcademicDataService = require('../src/services/postgres/admin/AcademicDataService');

const { getRequestedSequence } = LecturerJobsheetsService._private;
const { isCompletedSubmissionStatus } = StudentJobsheetsService._private;

function createMockClient(results) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next || { rows: [] };
    },
  };
}

test('urutan jobsheet menerima alias urutan, sequence, dan jobsheet_number', () => {
  assert.equal(getRequestedSequence({ urutan: 2 }), 2);
  assert.equal(getRequestedSequence({ sequence: 3 }), 3);
  assert.equal(getRequestedSequence({ jobsheet_number: 4 }), 4);
});

test('urutan jobsheet null jika tidak dikirim', () => {
  assert.equal(getRequestedSequence({}), null);
});

test('urutan jobsheet menolak angka kurang dari satu', () => {
  assert.throws(
    () => getRequestedSequence({ urutan: 0 }),
    /JOBSHEET_SEQUENCE_INVALID/,
  );
});

test('submission selesai jika sudah dikumpulkan atau direview', () => {
  assert.equal(isCompletedSubmissionStatus({ status: 'SUBMITTED' }), true);
  assert.equal(isCompletedSubmissionStatus({ status: 'REVIEWED' }), true);
  assert.equal(isCompletedSubmissionStatus({ status: 'ACCEPTED' }), true);
  assert.equal(isCompletedSubmissionStatus({ submitted_at: '2026-07-09 10:00:00' }), true);
});

test('submission draft belum dianggap selesai', () => {
  assert.equal(isCompletedSubmissionStatus({ status: 'DRAFT' }), false);
  assert.equal(isCompletedSubmissionStatus({}), false);
});

test('validasi jumlah jobsheet rencana menolak nilai di bawah jumlah dibuat', async () => {
  const service = Object.create(AcademicDataService.prototype);
  const client = createMockClient([
    { rows: [{ total: 3 }] },
  ]);

  await assert.rejects(
    () => service._assertJobsheetPlanAllowed(client, 'kp-1', 2),
    /JOBSHEET_PLAN_BELOW_CREATED/,
  );
});

test('validasi urutan jobsheet menolak urutan melebihi rencana', async () => {
  const service = Object.create(LecturerJobsheetsService.prototype);
  const client = createMockClient([
    { rows: [{ jumlah_jobsheet_rencana: 2 }] },
    { rows: [] },
  ]);

  await assert.rejects(
    () => service._validateJobsheetSequence(client, {
      kelasPraktikumId: 'kp-1',
      sequence: 3,
      jobsheetId: 'job-1',
    }),
    /JOBSHEET_SEQUENCE_EXCEEDS_PLAN/,
  );
});

test('validasi urutan jobsheet menolak duplikasi dalam satu kelas praktikum', async () => {
  const service = Object.create(LecturerJobsheetsService.prototype);
  const client = createMockClient([
    { rows: [{ jumlah_jobsheet_rencana: 4 }] },
    { rows: [{ exists: 1 }] },
  ]);

  await assert.rejects(
    () => service._validateJobsheetSequence(client, {
      kelasPraktikumId: 'kp-1',
      sequence: 2,
      jobsheetId: 'job-2',
    }),
    /JOBSHEET_SEQUENCE_DUPLICATE/,
  );
});

test('akses mahasiswa membuka jobsheet pertama jika sudah publish', async () => {
  const service = new StudentJobsheetsService();
  service._pool = createMockClient([
    { rows: [{ id: 'jc-1', urutan: 1, status: 'PUBLISHED', is_active: true }] },
    { rows: [] },
  ]);

  const access = await service._resolveSequenceAccess('mhs-1', 'job-1', 'kp-1');
  assert.equal(access.canOpen, true);
});

test('akses mahasiswa menolak jobsheet kedua jika sebelumnya belum selesai', async () => {
  const service = new StudentJobsheetsService();
  service._pool = createMockClient([
    { rows: [{ id: 'jc-2', urutan: 2, status: 'PUBLISHED', is_active: true }] },
    { rows: [{ jobsheet_id: 'job-1', urutan: 1 }] },
    { rows: [] },
  ]);

  const access = await service._resolveSequenceAccess('mhs-1', 'job-2', 'kp-1');
  assert.equal(access.canOpen, false);
  assert.equal(access.message, 'Selesaikan jobsheet sebelumnya terlebih dahulu.');
});

test('akses mahasiswa membuka jobsheet kedua setelah sebelumnya selesai', async () => {
  const service = new StudentJobsheetsService();
  service._pool = createMockClient([
    { rows: [{ id: 'jc-2', urutan: 2, status: 'PUBLISHED', is_active: true }] },
    { rows: [{ jobsheet_id: 'job-1', urutan: 1 }] },
    { rows: [{ exists: 1 }] },
  ]);

  const access = await service._resolveSequenceAccess('mhs-1', 'job-2', 'kp-1');
  assert.equal(access.canOpen, true);
});

test('akses mahasiswa menolak jobsheet yang belum publish', async () => {
  const service = new StudentJobsheetsService();
  service._pool = createMockClient([
    { rows: [{ id: 'jc-1', urutan: 1, status: 'DRAFT', is_active: true }] },
  ]);

  const access = await service._resolveSequenceAccess('mhs-1', 'job-1', 'kp-1');
  assert.equal(access.canOpen, false);
  assert.equal(access.message, 'Jobsheet belum dipublish.');
});

test('delete jobsheet ditolak jika sudah ada data pengerjaan', async () => {
  const service = Object.create(LecturerJobsheetsService.prototype);
  const client = createMockClient([
    { rows: [{ submissions: 1, student_progress: 0, jobsheet_progress: 0, activity_logs: 0, reviews: 0, remedials: 0 }] },
  ]);

  await assert.rejects(
    () => service._deleteJobsheetDraft(client, 'job-1'),
    /Jobsheet tidak dapat dihapus karena sudah memiliki data pengerjaan mahasiswa/,
  );
});

test('delete jobsheet berhasil jika belum ada data pengerjaan', async () => {
  const service = Object.create(LecturerJobsheetsService.prototype);
  const client = createMockClient([
    { rows: [{ submissions: 0, student_progress: 0, jobsheet_progress: 0, activity_logs: 0, reviews: 0, remedials: 0 }] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [{ id: 'job-1' }] },
  ]);

  const deleted = await service._deleteJobsheetDraft(client, 'job-1');
  assert.deepEqual(deleted, { id: 'job-1' });
});
