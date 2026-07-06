const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveStudentMonitoringStatus,
} = require('../src/services/postgres/student/StudentJobsheetProgressService');

test('submission auto-submit SUBMITTED dihitung selesai walau deadline lewat dan progress kosong', () => {
  const result = resolveStudentMonitoringStatus({
    submissionStatus: 'SUBMITTED',
    submissionSource: 'auto_deadline',
    isAutoSubmitted: true,
    isDeadlinePassed: true,
    progressPercentage: 0,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.label, 'Selesai');
  assert.equal(result.submissionLabel, 'Dikumpulkan Otomatis');
});

test('submission REVIEWED dihitung selesai', () => {
  const result = resolveStudentMonitoringStatus({
    submissionStatus: 'REVIEWED',
    submissionSource: 'manual',
    isDeadlinePassed: true,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.label, 'Selesai');
});

test('deadline lewat tanpa submission dihitung terlambat', () => {
  const result = resolveStudentMonitoringStatus({
    submissionStatus: null,
    isDeadlinePassed: true,
    lastActivityAt: null,
  });

  assert.equal(result.status, 'overdue');
  assert.equal(result.label, 'Terlambat');
});

test('sebelum deadline dengan aktivitas dihitung mengerjakan', () => {
  const result = resolveStudentMonitoringStatus({
    submissionStatus: null,
    isDeadlinePassed: false,
    progressPercentage: 30,
  });

  assert.equal(result.status, 'in_progress');
  assert.equal(result.label, 'Mengerjakan');
});

test('sebelum deadline tanpa aktivitas dihitung belum mulai', () => {
  const result = resolveStudentMonitoringStatus({
    submissionStatus: null,
    isDeadlinePassed: false,
    progressPercentage: 0,
  });

  assert.equal(result.status, 'not_started');
  assert.equal(result.label, 'Belum Mulai');
});
