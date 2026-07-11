const WebSocket = require('ws');
const pool = require('../postgres');

const MAX_CONTENT_BYTES = 512 * 1024;
const LIVE_WORKSPACE_DEBUG = process.env.NODE_ENV !== 'production' && process.env.LIVE_WORKSPACE_DEBUG === 'true';
const VALID_TYPES = new Set([
  'join-live-workspace',
  'leave-live-workspace',
  'workspace-file-content',
  'active-file-changed',
  'active-section-changed',
  'analysis-patch',
  'workspace-file-created',
  'workspace-file-deleted',
  'workspace-file-renamed',
  'workspace-full-sync',
  'workspace-resync-request',
]);

function roomId({ kelasPraktikumId, jobsheetId, studentId }) {
  return `live-workspace:${kelasPraktikumId}:${jobsheetId}:${studentId}`;
}

function isValidFilePath(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 180) return false;
  if (/^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/') || value.startsWith('\\')) return false;
  if (value.split(/[\\/]+/).some((part) => part === '..')) return false;
  return true;
}

function byteLength(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value ?? ''), 'utf8');
}

function debugLog(message, payload) {
  if (LIVE_WORKSPACE_DEBUG) console.log(`[LIVE-WS][SERVER] ${message}`, payload || '');
}

function warnLog(message, payload) {
  console.warn(`[LIVE-WS][SERVER] ${message}`, payload || '');
}

class LiveWorkspaceHub {
  constructor() {
    this._rooms = new Map();
  }

  _getRoom(key) {
    if (!this._rooms.has(key)) {
      this._rooms.set(key, {
        studentConnection: null,
        lecturerViewerConnections: new Set(),
        workspaceVersion: 0,
        latestSnapshotMetadata: null,
      });
    }
    return this._rooms.get(key);
  }

  _cleanup(key) {
    const room = this._rooms.get(key);
    if (!room) return;
    if (!room.studentConnection && room.lecturerViewerConnections.size === 0) {
      this._rooms.delete(key);
    }
  }

  async assertStudentAccess({ kelasPraktikumId, jobsheetId, studentId }) {
    const result = await pool.query(
      `SELECT 1
       FROM kelas_praktikum kp
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $3
        AND km.status = 'active'
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $2
        AND jc.is_active = true
       WHERE kp.id = $1
       LIMIT 1`,
      [kelasPraktikumId, jobsheetId, studentId],
    );
    return result.rows.length > 0;
  }

  async assertLecturerViewerAccess({ kelasPraktikumId, jobsheetId, studentId, lecturerId }) {
    const result = await pool.query(
      `SELECT 1
       FROM kelas_praktikum kp
       JOIN pengampu p
         ON p.id_kelas_praktikum = kp.id
        AND p.id_dosen = $4
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $3
        AND km.status = 'active'
       JOIN jobsheet_classes jc
         ON jc.id_kelas_praktikum = kp.id
        AND jc.jobsheet_id = $2
       WHERE kp.id = $1
       LIMIT 1`,
      [kelasPraktikumId, jobsheetId, studentId, lecturerId],
    );
    return result.rows.length > 0;
  }

  joinStudent(ws, context) {
    const key = roomId(context);
    const room = this._getRoom(key);
    room.studentConnection = ws;
    ws.liveWorkspace = { ...context, roomId: key, role: 'student' };
    debugLog('room joined', {
      roomId: key,
      userId: context.studentId,
      role: 'student',
      viewerCount: room.lecturerViewerConnections.size,
    });
    this._send(ws, { type: 'workspace-joined', role: 'student', roomId: key, workspaceVersion: room.workspaceVersion });
    this._broadcastToViewers(room, {
      type: 'student-workspace-online',
      kelasPraktikumId: context.kelasPraktikumId,
      jobsheetId: context.jobsheetId,
      studentId: context.studentId,
      workspaceVersion: room.workspaceVersion,
      updatedAt: new Date().toISOString(),
    });
  }

  joinLecturerViewer(ws, context) {
    const key = roomId(context);
    const room = this._getRoom(key);
    room.lecturerViewerConnections.add(ws);
    ws.liveWorkspace = { ...context, roomId: key, role: 'lecturer-viewer' };
    debugLog('room joined', {
      roomId: key,
      userId: context.studentId,
      role: 'lecturer-viewer',
      viewerCount: room.lecturerViewerConnections.size,
    });
    this._send(ws, {
      type: 'workspace-joined',
      role: 'lecturer-viewer',
      roomId: key,
      workspaceVersion: room.workspaceVersion,
      studentOnline: Boolean(room.studentConnection),
      latestSnapshotMetadata: room.latestSnapshotMetadata,
    });
  }

  leave(ws) {
    const context = ws.liveWorkspace;
    if (!context?.roomId) return;
    const room = this._rooms.get(context.roomId);
    if (!room) return;

    if (context.role === 'student' && room.studentConnection === ws) {
      room.studentConnection = null;
      this._broadcastToViewers(room, {
        type: 'student-workspace-offline',
        kelasPraktikumId: context.kelasPraktikumId,
        jobsheetId: context.jobsheetId,
        studentId: context.studentId,
        workspaceVersion: room.workspaceVersion,
        updatedAt: new Date().toISOString(),
      });
    }

    if (context.role === 'lecturer-viewer') {
      room.lecturerViewerConnections.delete(ws);
    }

    ws.liveWorkspace = null;
    debugLog('socket left room', {
      roomId: context.roomId,
      role: context.role,
      viewerCount: room.lecturerViewerConnections.size,
    });
    this._cleanup(context.roomId);
  }

  handleMessage(ws, rawMessage) {
    let message;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      this._sendError(ws, 'Payload WebSocket tidak valid.');
      return;
    }

    if (!VALID_TYPES.has(message.type)) {
      warnLog('message rejected', { reason: 'invalid_type', type: message.type });
      this._sendError(ws, 'Tipe message live workspace tidak valid.');
      return;
    }

    if (message.type === 'leave-live-workspace') {
      this.leave(ws);
      this._send(ws, { type: 'workspace-left' });
      return;
    }

    const context = ws.liveWorkspace;
    if (!context?.roomId) {
      warnLog('message rejected', { reason: 'not_joined', type: message.type });
      this._sendError(ws, 'Koneksi belum join live workspace.');
      return;
    }

    if (context.role !== 'student') {
      warnLog('message rejected', { reason: 'viewer_readonly', roomId: context.roomId, type: message.type });
      this._sendError(ws, 'Viewer dosen bersifat read-only.');
      return;
    }

    if (message.kelasPraktikumId !== context.kelasPraktikumId || message.jobsheetId !== context.jobsheetId) {
      warnLog('message rejected', { reason: 'room_identity_mismatch', roomId: context.roomId, type: message.type });
      this._sendError(ws, 'Identitas workspace tidak sesuai room.');
      return;
    }

    const room = this._rooms.get(context.roomId);
    if (!room) {
      this._sendError(ws, 'Room live workspace tidak ditemukan.');
      return;
    }

    const validationError = this._validatePatchMessage(message, room.workspaceVersion);
    if (validationError === 'version-gap') {
      warnLog('message rejected', { reason: 'version_gap', roomId: context.roomId, currentVersion: room.workspaceVersion, baseVersion: message.baseVersion });
      this._send(ws, {
        type: 'workspace-resync-required',
        workspaceVersion: room.workspaceVersion,
        reason: 'Versi workspace tidak sinkron.',
      });
      return;
    }
    if (validationError) {
      warnLog('message rejected', { reason: validationError, roomId: context.roomId, type: message.type });
      this._sendError(ws, validationError);
      return;
    }

    room.workspaceVersion = Number(message.nextVersion ?? message.workspaceVersion ?? room.workspaceVersion + 1);
    room.latestSnapshotMetadata = {
      workspaceVersion: room.workspaceVersion,
      activeFilePath: message.filePath || message.activeFilePath || null,
      activeSection: message.sectionType ? {
        type: message.sectionType,
        id: message.sectionId || null,
        name: message.sectionName || null,
      } : null,
      updatedAt: message.updatedAt || new Date().toISOString(),
    };

    const outbound = {
      ...message,
      studentId: context.studentId,
      workspaceVersion: room.workspaceVersion,
      nextVersion: room.workspaceVersion,
      eventVersion: 1,
    };
    debugLog('workspace update received', {
      roomId: context.roomId,
      studentId: context.studentId,
      type: message.type,
      filePath: message.filePath,
      version: room.workspaceVersion,
    });
    this._broadcastToViewers(room, outbound);
    this._send(ws, { type: 'workspace-patch-accepted', workspaceVersion: room.workspaceVersion });
  }

  _validatePatchMessage(message, currentVersion) {
    if (['workspace-file-content', 'workspace-file-created'].includes(message.type)) {
      if (!isValidFilePath(message.filePath)) return 'Path file tidak valid.';
      if (byteLength(message.content || '') > MAX_CONTENT_BYTES) return 'Ukuran file terlalu besar.';
    }
    if (message.type === 'workspace-file-deleted' && !isValidFilePath(message.filePath)) return 'Path file tidak valid.';
    if (message.type === 'workspace-file-renamed') {
      if (!isValidFilePath(message.oldFilePath) || !isValidFilePath(message.newFilePath)) return 'Path file tidak valid.';
    }
    if (message.type === 'analysis-patch' && byteLength(message.content || {}) > MAX_CONTENT_BYTES) return 'Ukuran analisis terlalu besar.';

    const baseVersion = Number(message.baseVersion ?? currentVersion);
    const nextVersion = Number(message.nextVersion ?? message.workspaceVersion ?? currentVersion + 1);
    if (!Number.isInteger(baseVersion) || !Number.isInteger(nextVersion)) return 'Versi workspace tidak valid.';
    if (baseVersion !== currentVersion) return 'version-gap';
    if (nextVersion <= currentVersion) return 'Versi lama tidak dapat diterapkan.';
    return null;
  }

  _broadcastToViewers(room, payload) {
    let sentCount = 0;
    let failedCount = 0;
    for (const viewer of room.lecturerViewerConnections) {
      if (viewer.readyState === WebSocket.OPEN) {
        try {
          viewer.send(JSON.stringify(payload));
          sentCount += 1;
        } catch {
          failedCount += 1;
          room.lecturerViewerConnections.delete(viewer);
        }
      }
    }
    debugLog('broadcasting workspace update', {
      type: payload.type,
      viewerCount: room.lecturerViewerConnections.size,
      sentCount,
      failedCount,
    });
  }

  _send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }

  _sendError(ws, message) {
    this._send(ws, { type: 'workspace-error', message });
  }

  getRoomState(context) {
    const room = this._rooms.get(roomId(context));
    return {
      exists: Boolean(room),
      studentOnline: Boolean(room?.studentConnection),
      viewerCount: room?.lecturerViewerConnections.size || 0,
      workspaceVersion: room?.workspaceVersion || 0,
    };
  }
}

module.exports = new LiveWorkspaceHub();
module.exports._private = { roomId, isValidFilePath };
