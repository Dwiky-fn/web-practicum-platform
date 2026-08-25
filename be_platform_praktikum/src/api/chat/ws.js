const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

let globalBroadcastToRoom = null;
let globalBroadcastToUser = null;

function broadcastChatMessage(conversationId, msg) {
  if (globalBroadcastToRoom) {
    globalBroadcastToRoom(`conv:${conversationId}`, 'chat:message:new', msg);
    const recipientId =
      msg.conversation?.student_id === msg.sender_id
        ? msg.conversation?.lecturer_id
        : msg.conversation?.student_id;
    if (recipientId && globalBroadcastToUser) {
      globalBroadcastToUser(recipientId, 'chat:notification:new', msg);
    }
  }
}

function initChatWebSocketServer(server, chatService) {
  const wss = new WebSocketServer({ noServer: true });

  // Map of conversationId -> Set of WebSockets
  const rooms = new Map();
  // Map of userId -> Set of WebSockets
  const userSockets = new Map();

  function addToRoom(roomName, socket) {
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }
    rooms.get(roomName).add(socket);
    if (!socket.subscribedRooms) socket.subscribedRooms = new Set();
    socket.subscribedRooms.add(roomName);
  }

  function removeFromAllRooms(socket) {
    if (socket.subscribedRooms) {
      socket.subscribedRooms.forEach((roomName) => {
        const set = rooms.get(roomName);
        if (set) {
          set.delete(socket);
          if (set.size === 0) rooms.delete(roomName);
        }
      });
    }
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  }

  function broadcastToRoom(roomName, event, payload) {
    const set = rooms.get(roomName);
    if (set) {
      const data = JSON.stringify({ event, data: payload });
      set.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    }
  }

  function broadcastToUser(userId, event, payload) {
    const set = userSockets.get(userId);
    if (set) {
      const data = JSON.stringify({ event, data: payload });
      set.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    }
  }

  globalBroadcastToRoom = broadcastToRoom;
  globalBroadcastToUser = broadcastToUser;

  // Handle upgrade requests for /chat
  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = url.parse(request.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      const queryToken = parsedUrl.query?.token;
      const authHeader = request.headers['authorization'];
      let token = queryToken;

      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        const secret =
          process.env.AUTH_TOKEN_SECRET ||
          process.env.JWT_SECRET ||
          process.env.ACCESS_TOKEN_SECRET ||
          (process.env.NODE_ENV === "production" ? null : "development-only-auth-secret")

        if (!secret) {
          throw new Error("SECRET_NOT_FOUND")
        }

        const decoded = jwt.verify(token, secret)
        const userId = decoded.sub || decoded.id

        wss.handleUpgrade(request, socket, head, (ws) => {
          ws.user = { id: userId, sub: userId, role: decoded.role }
          ws.userId = userId
          wss.emit("connection", ws, request)
        })
      } catch (err) {
        console.error("[CHAT-WS] Token verification failed:", err.message)
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
        socket.destroy()
      }
    }
  });

  wss.on('connection', (ws) => {
    const user = ws.user;
    if (!user) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!userSockets.has(user.id)) {
      userSockets.set(user.id, new Set());
    }
    userSockets.get(user.id).add(ws);

    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        const { event, data: body } = payload;

        if (event === 'chat:subscribe') {
          const { conversationId } = body || {};
          if (!conversationId) return;

          await chatService.verifyConversationParticipant(conversationId, user.id);
          addToRoom(`conv:${conversationId}`, ws);
          ws.send(JSON.stringify({ event: 'chat:subscribed', data: { conversationId } }));
        }

        if (event === 'chat:message') {
          const { conversationId, message, clientMessageId } = body || {};
          const msg = await chatService.sendMessage({
            conversationId,
            senderId: user.id,
            message,
            clientMessageId,
          });

          // Broadcast new message to conversation room
          broadcastToRoom(`conv:${conversationId}`, 'chat:message:new', msg);

          // Notify the recipient
          const recipientId =
            msg.conversation.student_id === user.id
              ? msg.conversation.lecturer_id
              : msg.conversation.student_id;
          broadcastToUser(recipientId, 'chat:notification:new', msg);
        }

        if (event === 'chat:read') {
          const { conversationId } = body || {};
          if (!conversationId) return;

          const res = await chatService.markAsRead({ conversationId, userId: user.id });
          broadcastToRoom(`conv:${conversationId}`, 'chat:read', {
            conversationId,
            readerId: user.id,
            ...res,
          });
        }
      } catch (err) {
        ws.send(JSON.stringify({ event: 'chat:error', data: { message: err.message } }));
      }
    });

    ws.on('close', () => {
      removeFromAllRooms(ws);
    });

    ws.on('error', () => {
      removeFromAllRooms(ws);
    });
  });

  return wss;
}

module.exports = {
  initChatWebSocketServer,
  broadcastChatMessage,
};
