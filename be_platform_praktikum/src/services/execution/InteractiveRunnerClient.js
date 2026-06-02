const WebSocket = require('ws');

const RUNNER_URL =
  process.env.INTERACTIVE_RUNNER_WS_URL || 'ws://10.10.23.112:4000/ws';

class InteractiveRunnerClient {
  constructor({ runnerUrl = RUNNER_URL } = {}) {
    this._runnerUrl = runnerUrl;
    this._socket = null;
    this._isRunning = false;
  }

  run(code, handlers) {
    this.close();

    this._socket = new WebSocket(this._runnerUrl);

    this._socket.on('open', () => {
      this._isRunning = true;
      this._sendToRunner({ type: 'run', code });
    });

    this._socket.on('message', (data) => {
      const message = this._parseRunnerMessage(data);

      if (message.type === 'exit' || message.type === 'timeout') {
        this._isRunning = false;
      }

      handlers.onMessage(message);
    });

    this._socket.on('error', (error) => {
      this._isRunning = false;
      handlers.onMessage({
        type: 'error',
        data: error.message || 'Gagal terhubung ke interactive runner',
      });
    });

    this._socket.on('close', () => {
      this._isRunning = false;
      handlers.onClose();
    });
  }

  sendInput(value) {
    this._sendToRunner({ type: 'input', value });
  }

  stop() {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._sendToRunner({ type: 'stop' });
      return;
    }

    this.close();
  }

  close() {
    if (!this._socket) return;

    if (
      this._socket.readyState === WebSocket.OPEN ||
      this._socket.readyState === WebSocket.CONNECTING
    ) {
      this._socket.close();
    }

    this._socket = null;
    this._isRunning = false;
  }

  _sendToRunner(payload) {
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      throw new Error('Interactive runner belum siap menerima pesan');
    }

    this._socket.send(JSON.stringify(payload));
  }

  _parseRunnerMessage(data) {
    try {
      return JSON.parse(data.toString());
    } catch (error) {
      return {
        type: 'output',
        data: data.toString(),
      };
    }
  }
}

module.exports = InteractiveRunnerClient;
