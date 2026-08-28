function getBaseMonitoringWsUrl() {
  const envUrl = import.meta.env.VITE_MONITORING_WS_URL
  if (envUrl) return envUrl
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}/monitoring`
  }
  return "ws://localhost:3000/monitoring"
}

export type MonitoringSocketEvent = {
  type: string
  eventVersion?: number
  eventName?: string
  kelasPraktikumId?: string
  studentId?: string
  jobsheetId?: string
  jobsheetClassId?: string | null
  jobsheetName?: string | null
  jobsheetSequence?: number | null
  sectionType?: string
  sectionId?: string | null
  sectionName?: string | null
  lastActiveAt?: string
  runCount?: number
  progressPercentage?: number | null
  submissionStatus?: string | null
}

function parseMonitoringEvent(raw: string): MonitoringSocketEvent | null {
  try {
    const payload = JSON.parse(raw) as MonitoringSocketEvent
    if (!payload || typeof payload.type !== "string") return null
    if (payload.type === "student-monitoring-updated") {
      if (!payload.kelasPraktikumId || !payload.studentId || !payload.lastActiveAt) return null
      const time = new Date(payload.lastActiveAt).getTime()
      if (Number.isNaN(time)) return null
    }
    return payload
  } catch {
    return null
  }
}

export function connectMonitoringSocket(
  kelasPraktikumId: string,
  onEvent: (event: MonitoringSocketEvent) => void,
  onStatus?: (status: "connected" | "connecting" | "disconnected") => void,
  onReconnectSnapshot?: () => void,
) {
  const token = localStorage.getItem("authToken")
  if (!token || !kelasPraktikumId) return () => {}

  let closed = false
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null

  const connect = () => {
    onStatus?.("connecting")
    const url = new URL(getBaseMonitoringWsUrl())
    url.searchParams.set("token", token)
    url.searchParams.set("kelasPraktikumId", kelasPraktikumId)
    socket = new WebSocket(url)

    socket.addEventListener("message", (event) => {
      const payload = parseMonitoringEvent(event.data)
      if (!payload) return
      if (payload.type === "monitoring-subscribed") {
        onStatus?.("connected")
        onReconnectSnapshot?.()
        return
      }
      onEvent(payload)
    })
    socket.addEventListener("close", () => {
      onStatus?.("disconnected")
      if (!closed) {
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    })
    socket.addEventListener("error", () => {
      socket?.close()
    })
  }

  connect()

  return () => {
    closed = true
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}
