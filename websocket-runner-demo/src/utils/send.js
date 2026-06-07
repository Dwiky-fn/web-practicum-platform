const WebSocket = require('ws');

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendStart(ws, message = 'Program started') {
  send(ws, { type: 'start', message });
}

function sendStdout(ws, data) {
  send(ws, { type: 'stdout', data });
}

function sendStderr(ws, data) {
  send(ws, { type: 'stderr', data });
}

function sendExit(ws, code, message = 'Program finished') {
  send(ws, { type: 'exit', code, message });
}

function sendError(ws, message) {
  send(ws, { type: 'error', message });
}

module.exports = {
  send,
  sendStart,
  sendStdout,
  sendStderr,
  sendExit,
  sendError,
};

