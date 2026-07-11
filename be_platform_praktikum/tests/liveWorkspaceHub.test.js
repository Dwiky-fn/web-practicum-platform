const test = require('node:test');
const assert = require('node:assert/strict');

const LiveWorkspaceHub = require('../src/services/monitoring/LiveWorkspaceHub');

function fakeSocket() {
  return {
    readyState: 1,
    sent: [],
    send(message) {
      this.sent.push(JSON.parse(message));
    },
  };
}

test('live workspace mengirim patch mahasiswa hanya ke viewer room yang sama', () => {
  const student = fakeSocket();
  const viewerA = fakeSocket();
  const viewerB = fakeSocket();

  LiveWorkspaceHub.joinStudent(student, { kelasPraktikumId: 'kp-a', jobsheetId: 'job-a', studentId: 'mhs-a' });
  LiveWorkspaceHub.joinLecturerViewer(viewerA, { kelasPraktikumId: 'kp-a', jobsheetId: 'job-a', studentId: 'mhs-a' });
  LiveWorkspaceHub.joinLecturerViewer(viewerB, { kelasPraktikumId: 'kp-b', jobsheetId: 'job-a', studentId: 'mhs-a' });

  LiveWorkspaceHub.handleMessage(student, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-a',
    jobsheetId: 'job-a',
    filePath: 'src/Main.java',
    content: 'class Main {}',
    baseVersion: 0,
    nextVersion: 1,
    updatedAt: '2026-07-11T14:05:00.000Z',
  }));

  assert.equal(viewerA.sent.some((item) => item.type === 'workspace-file-content'), true);
  assert.equal(viewerB.sent.some((item) => item.type === 'workspace-file-content'), false);

  LiveWorkspaceHub.leave(student);
  LiveWorkspaceHub.leave(viewerA);
  LiveWorkspaceHub.leave(viewerB);
});

test('viewer dosen tidak dapat mengirim patch live workspace', () => {
  const viewer = fakeSocket();
  LiveWorkspaceHub.joinLecturerViewer(viewer, { kelasPraktikumId: 'kp-read', jobsheetId: 'job-read', studentId: 'mhs-read' });
  LiveWorkspaceHub.handleMessage(viewer, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-read',
    jobsheetId: 'job-read',
    filePath: 'src/Main.java',
    content: 'edit dosen',
    baseVersion: 0,
    nextVersion: 1,
  }));

  assert.equal(viewer.sent.at(-1).type, 'workspace-error');
  LiveWorkspaceHub.leave(viewer);
});

test('live workspace menolak event versi lama dan gap versi meminta resync', () => {
  const student = fakeSocket();
  LiveWorkspaceHub.joinStudent(student, { kelasPraktikumId: 'kp-version', jobsheetId: 'job-version', studentId: 'mhs-version' });

  LiveWorkspaceHub.handleMessage(student, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-version',
    jobsheetId: 'job-version',
    filePath: 'src/Main.java',
    content: 'v1',
    baseVersion: 0,
    nextVersion: 1,
  }));
  LiveWorkspaceHub.handleMessage(student, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-version',
    jobsheetId: 'job-version',
    filePath: 'src/Main.java',
    content: 'old',
    baseVersion: 0,
    nextVersion: 1,
  }));

  assert.equal(student.sent.at(-1).type, 'workspace-resync-required');

  LiveWorkspaceHub.handleMessage(student, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-version',
    jobsheetId: 'job-version',
    filePath: 'src/Main.java',
    content: 'gap',
    baseVersion: 9,
    nextVersion: 10,
  }));

  assert.equal(student.sent.at(-1).type, 'workspace-resync-required');
  LiveWorkspaceHub.leave(student);
});

test('live workspace menolak file path traversal', () => {
  const student = fakeSocket();
  LiveWorkspaceHub.joinStudent(student, { kelasPraktikumId: 'kp-path', jobsheetId: 'job-path', studentId: 'mhs-path' });
  LiveWorkspaceHub.handleMessage(student, JSON.stringify({
    type: 'workspace-file-content',
    kelasPraktikumId: 'kp-path',
    jobsheetId: 'job-path',
    filePath: '../secret.txt',
    content: 'bad',
    baseVersion: 0,
    nextVersion: 1,
  }));

  assert.equal(student.sent.at(-1).type, 'workspace-error');
  LiveWorkspaceHub.leave(student);
});
