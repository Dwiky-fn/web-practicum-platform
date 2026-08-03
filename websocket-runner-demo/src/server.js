const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { handleSocketConnection } = require('./websocket/socketHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4000;

const RUNNER_API_KEY = process.env.RUNNER_API_KEY || process.env.INTERACTIVE_RUNNER_API_KEY || '';

wss.on('connection', (ws, req) => {
  if (RUNNER_API_KEY) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || req.headers['x-runner-api-key'];

    if (token !== RUNNER_API_KEY) {
      console.warn('[Runner Auth] Unauthorized WebSocket connection attempt rejected.');
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Invalid Runner API Key' }));
      ws.close(4001, 'Unauthorized');
      return;
    }
  }

  handleSocketConnection(ws, req);
});

app.get("/", (req, res) => {
  res.send("Code Runner Service Running");
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
