const WebSocket = require('ws');
const pool = require('../postgres');

class MonitoringRealtimeHub {
  constructor() {
    this._subscriptions = new Map();
  }

  _key(kelasPraktikumId) {
    return String(kelasPraktikumId || '');
  }

  subscribe(kelasPraktikumId, ws) {
    const key = this._key(kelasPraktikumId);
    if (!key) return () => {};
    if (!this._subscriptions.has(key)) this._subscriptions.set(key, new Set());
    const clients = this._subscriptions.get(key);
    clients.add(ws);

    return () => {
      clients.delete(ws);
      if (!clients.size) this._subscriptions.delete(key);
    };
  }

  async assertLecturerAccess(kelasPraktikumId, lecturerId) {
    const result = await pool.query(
      `SELECT 1
       FROM pengampu
       WHERE id_kelas_praktikum = $1
         AND id_dosen = $2
       LIMIT 1`,
      [kelasPraktikumId, lecturerId],
    );
    return result.rows.length > 0;
  }

  broadcastStudentActivity(payload) {
    if (!payload?.kelasPraktikumId || !payload?.studentId || !payload?.lastActiveAt) return;
    const key = this._key(payload.kelasPraktikumId);
    const clients = this._subscriptions.get(key);
    if (!clients?.size) return;

    const message = JSON.stringify({
      type: 'student-monitoring-updated',
      eventVersion: 1,
      ...payload,
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

module.exports = new MonitoringRealtimeHub();
