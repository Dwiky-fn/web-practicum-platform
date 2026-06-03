const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { handleSocketConnection } = require('./websocket/socketHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4000;

wss.on('connection', handleSocketConnection);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
