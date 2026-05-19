const WebSocket = require('ws');
const InteractiveRunnerClient = require('../../services/execution/InteractiveRunnerClient');
const ExecutionGatewayService = require('../../services/execution/ExecutionGatewayService');

const EXECUTION_PATH = '/execution';

const execution = (server) => {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname !== EXECUTION_PATH) return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const gateway = new ExecutionGatewayService(new InteractiveRunnerClient());

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
          data: error.message || 'Gagal memproses pesan execution',
        });
      }
    });

    ws.on('close', () => {
      gateway.close();
    });
  });
};

module.exports = execution;
