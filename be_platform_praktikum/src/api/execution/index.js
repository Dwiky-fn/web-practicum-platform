const WebSocket = require('ws');
const InteractiveRunnerClient = require('../../services/execution/InteractiveRunnerClient');
const ExecutionGatewayService = require('../../services/execution/ExecutionGatewayService');
const CodeRunActivityLogger = require('../../services/execution/CodeRunActivityLogger');
const { authenticateToken } = require('../../middlewares/auth');

const EXECUTION_PATH = '/execution';

const execution = (server) => {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const { pathname, searchParams } = new URL(
      request.url,
      `http://${request.headers.host}`,
    );

    if (pathname !== EXECUTION_PATH) return;

    const token = searchParams.get('token');
    const user = token ? await authenticateToken(token).catch(() => null) : null;

    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    request.user = user;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
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
