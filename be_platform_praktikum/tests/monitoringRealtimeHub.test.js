const test = require('node:test');
const assert = require('node:assert/strict');

const MonitoringRealtimeHub = require('../src/services/monitoring/MonitoringRealtimeHub');
const MonitoringActivityService = require('../src/services/monitoring/MonitoringActivityService');

function fakeSocket() {
  return {
    readyState: 1,
    sent: [],
    send(message) {
      this.sent.push(JSON.parse(message));
    },
  };
}

test('monitoring realtime mengirim event hanya ke kelas yang disubscribe', () => {
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const unsubscribeA = MonitoringRealtimeHub.subscribe('kelas-a', socketA);
  const unsubscribeB = MonitoringRealtimeHub.subscribe('kelas-b', socketB);

  MonitoringRealtimeHub.broadcastStudentActivity({
    kelasPraktikumId: 'kelas-a',
    studentId: 'student-1',
    jobsheetId: 'jobsheet-1',
    sectionType: 'experiment',
    sectionId: 'exp-1',
    lastActiveAt: '2026-07-10T14:35:00.000Z',
    runCount: 5,
  });

  assert.equal(socketA.sent.length, 1);
  assert.equal(socketA.sent[0].type, 'student-monitoring-updated');
  assert.equal(socketA.sent[0].kelasPraktikumId, 'kelas-a');
  assert.equal(socketA.sent[0].studentId, 'student-1');
  assert.equal(socketA.sent[0].eventVersion, 1);
  assert.equal(socketB.sent.length, 0);

  unsubscribeA();
  unsubscribeB();
});

test('monitoring activity menamai event penting secara konsisten', () => {
  const { eventNameFromActivity } = MonitoringActivityService._private;
  assert.equal(eventNameFromActivity('CODE_RUN'), 'code-run');
  assert.equal(eventNameFromActivity('open_experiment'), 'experiment-opened');
  assert.equal(eventNameFromActivity('open_instruction'), 'instruction-opened');
  assert.equal(eventNameFromActivity('save_code'), 'work-saved');
  assert.equal(eventNameFromActivity('complete_experiment'), 'section-completed');
  assert.equal(eventNameFromActivity('submit_answer'), 'submission-updated');
});
