class MonitoringSseHub {
  constructor() {
    this._subscriptions = new Map();
  }

  _key(kelasPraktikumId) {
    return String(kelasPraktikumId || '');
  }

  subscribe(kelasPraktikumId, res) {
    const key = this._key(kelasPraktikumId);
    if (!key) return () => {};

    if (!this._subscriptions.has(key)) {
      this._subscriptions.set(key, new Set());
    }
    const clients = this._subscriptions.get(key);
    clients.add(res);

    console.log(`[SSE][SUBSCRIBE] Client connected to stream for kelasPraktikumId=${key} (Active clients: ${clients.size})`);

    // Set SSE Headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Send connection confirmation
    this.sendToClient(res, 'monitoring-subscribed', {
      type: 'monitoring-subscribed',
      kelasPraktikumId: key,
      timestamp: new Date().toISOString(),
    });

    // Setup heartbeat ping every 15 seconds
    const pingInterval = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    const cleanup = () => {
      clearInterval(pingInterval);
      clients.delete(res);
      console.log(`[SSE][UNSUBSCRIBE] Client disconnected from stream for kelasPraktikumId=${key} (Remaining clients: ${clients.size})`);
      if (!clients.size) {
        this._subscriptions.delete(key);
      }
    };

    res.on('close', cleanup);
    res.on('error', cleanup);

    return cleanup;
  }

  sendToClient(res, eventName, data) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  broadcast(kelasPraktikumId, eventName, data) {
    const key = this._key(kelasPraktikumId);
    const clients = this._subscriptions.get(key);
    if (!clients || !clients.size) {
      console.log(`[SSE][BROADCAST-SKIP] No active clients for kelasPraktikumId=${key} (Event: ${eventName})`);
      return;
    }

    console.log(`[SSE][BROADCAST] Event "${eventName}" sent to ${clients.size} client(s) for kelasPraktikumId=${key}`, {
      eventName,
      studentId: data.studentId,
      sectionType: data.sectionType,
      sectionId: data.sectionId || data.experimentId || data.exerciseId || data.instructionId,
      runCount: data.runCount,
    });

    for (const res of clients) {
      try {
        this.sendToClient(res, eventName, data);
      } catch (err) {
        console.error('[SSE][ERROR] Error broadcasting event to client:', err);
      }
    }
  }
}

module.exports = new MonitoringSseHub();
