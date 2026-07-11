const WebSocket = require('ws');
const InteractiveRunnerClient = require('../../services/execution/InteractiveRunnerClient');
const ExecutionGatewayService = require('../../services/execution/ExecutionGatewayService');
const CodeRunActivityLogger = require('../../services/execution/CodeRunActivityLogger');
const MonitoringRealtimeHub = require('../../services/monitoring/MonitoringRealtimeHub');
const LiveWorkspaceHub = require('../../services/monitoring/LiveWorkspaceHub');
const { authenticateToken } = require('../../middlewares/auth');

const EXECUTION_PATH = '/execution';
const MONITORING_PATH = '/monitoring';
const LIVE_WORKSPACE_PATH = '/live-workspace';
const LIVE_WORKSPACE_DEBUG = process.env.NODE_ENV !== 'production' && process.env.LIVE_WORKSPACE_DEBUG === 'true';

const execution = (server) => {
  const wss = new WebSocket.Server({ noServer: true });
  const monitoringWss = new WebSocket.Server({ noServer: true });
  const liveWorkspaceWss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const { pathname, searchParams } = new URL(
      request.url,
      `http://${request.headers.host}`,
    );

    if (pathname !== EXECUTION_PATH && pathname !== MONITORING_PATH && pathname !== LIVE_WORKSPACE_PATH) return;

    const token = searchParams.get('token');
    const user = token ? await authenticateToken(token).catch(() => null) : null;
    if (pathname === LIVE_WORKSPACE_PATH && LIVE_WORKSPACE_DEBUG) {
      console.log('[LIVE-WS][SERVER] connection received', { pathname, hasToken: Boolean(token) });
      console.log('[LIVE-WS][SERVER] authentication result', {
        success: Boolean(user),
        userId: user?.id,
        role: user?.role,
      });
    }

    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    request.user = user;
    request.searchParams = searchParams;

    if (pathname === MONITORING_PATH) {
      const kelasPraktikumId = searchParams.get('kelasPraktikumId') || searchParams.get('classId');
      const allowed = user.role === 'DOSEN' && kelasPraktikumId
        ? await MonitoringRealtimeHub.assertLecturerAccess(kelasPraktikumId, user.id).catch(() => false)
        : false;

      if (!allowed) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      request.kelasPraktikumId = kelasPraktikumId;
      monitoringWss.handleUpgrade(request, socket, head, (ws) => {
        monitoringWss.emit('connection', ws, request);
      });
      return;
    }

    if (pathname === LIVE_WORKSPACE_PATH) {
      liveWorkspaceWss.handleUpgrade(request, socket, head, (ws) => {
        liveWorkspaceWss.emit('connection', ws, request);
      });
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  monitoringWss.on('connection', (ws, request) => {
    const unsubscribe = MonitoringRealtimeHub.subscribe(request.kelasPraktikumId, ws);
    ws.send(JSON.stringify({
      type: 'monitoring-subscribed',
      kelasPraktikumId: request.kelasPraktikumId,
    }));
    ws.on('close', unsubscribe);
  });

  liveWorkspaceWss.on('connection', (ws, request) => {
    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message);
        if (payload.type === 'join-live-workspace') {
          if (LIVE_WORKSPACE_DEBUG) console.log('[LIVE-WS][SERVER] join requested', {
            role: payload.role,
            kelasPraktikumId: payload.kelasPraktikumId,
            jobsheetId: payload.jobsheetId,
            studentId: payload.studentId,
            userId: request.user.id,
            userRole: request.user.role,
          });
          const kelasPraktikumId = payload.kelasPraktikumId;
          const jobsheetId = payload.jobsheetId;
          const role = payload.role;
          if (!kelasPraktikumId || !jobsheetId || !role) {
            ws.send(JSON.stringify({ type: 'workspace-error', message: 'Payload join live workspace tidak lengkap.' }));
            return;
          }

          if (role === 'student') {
            if (request.user.role !== 'MAHASISWA') {
              ws.send(JSON.stringify({ type: 'workspace-error', message: 'Hanya mahasiswa yang dapat menjadi editor workspace.' }));
              return;
            }
            const studentId = request.user.id;
            const allowed = await LiveWorkspaceHub.assertStudentAccess({ kelasPraktikumId, jobsheetId, studentId });
            if (!allowed) {
              ws.send(JSON.stringify({ type: 'workspace-error', message: 'Mahasiswa tidak memiliki akses ke workspace ini.' }));
              return;
            }
            LiveWorkspaceHub.joinStudent(ws, { kelasPraktikumId, jobsheetId, studentId });
            return;
          }

          if (role === 'lecturer-viewer') {
            if (request.user.role !== 'DOSEN') {
              ws.send(JSON.stringify({ type: 'workspace-error', message: 'Hanya dosen yang dapat menjadi viewer workspace.' }));
              return;
            }
            const studentId = payload.studentId;
            const allowed = studentId
              ? await LiveWorkspaceHub.assertLecturerViewerAccess({ kelasPraktikumId, jobsheetId, studentId, lecturerId: request.user.id })
              : false;
            if (!allowed) {
              ws.send(JSON.stringify({ type: 'workspace-error', message: 'Dosen tidak memiliki akses ke live workspace ini.' }));
              return;
            }
            LiveWorkspaceHub.joinLecturerViewer(ws, { kelasPraktikumId, jobsheetId, studentId });
            return;
          }

          ws.send(JSON.stringify({ type: 'workspace-error', message: 'Role live workspace tidak valid.' }));
          return;
        }

        LiveWorkspaceHub.handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'workspace-error', message: error.message || 'Gagal memproses live workspace.' }));
      }
    });

    ws.on('close', () => {
      LiveWorkspaceHub.leave(ws);
    });
  });

  wss.on('connection', (ws, request) => {
    const gateway = new ExecutionGatewayService(new InteractiveRunnerClient(), {
      user: request?.user,
      activityLogger: new CodeRunActivityLogger(),
    });

    const sendToClient = (payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.on('message', (message) => {
      try {
        gateway.handleClientMessage(message, sendToClient);
      } catch (error) {
        sendToClient({
          type: 'error',
          message: error.message || 'Gagal memproses pesan execution',
        });
      }
    });

    ws.on('close', () => {
      gateway.close();
    });
  });
};

module.exports = execution;
