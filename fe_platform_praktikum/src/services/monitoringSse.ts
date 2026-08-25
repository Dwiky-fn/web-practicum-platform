import { API_BASE_URL } from "./api"

export type MonitoringSseEvent = {
  type: string
  eventVersion?: number
  eventName?: string
  kelasPraktikumId?: string
  studentId?: string
  studentName?: string
  nim?: string
  profilePhotoUrl?: string | null
  initials?: string
  jobsheetId?: string
  sectionType?: string
  sectionId?: string | null
  sectionName?: string | null
  experimentId?: string | null
  exerciseId?: string | null
  instructionId?: string | null
  lastActiveAt?: string
  runCount?: number
  runningCount?: number
}

export function connectMonitoringSse(
  kelasPraktikumId: string,
  onEvent: (event: MonitoringSseEvent) => void,
  onStatus?: (status: "connected" | "connecting" | "disconnected") => void,
  onReconnectSnapshot?: () => void,
) {
  const token = localStorage.getItem("authToken")
  if (!token || !kelasPraktikumId) return () => {}

  let eventSource: EventSource | null = null
  let isClosed = false

  const connect = () => {
    if (isClosed) return
    onStatus?.("connecting")
    const url = `${API_BASE_URL}/lecturer/kelas-praktikum/${kelasPraktikumId}/monitoring/events?token=${token}`
    console.log(`[SSE-CLIENT][CONNECT] Connecting to SSE stream: ${url}`)
    eventSource = new EventSource(url)

    eventSource.addEventListener("monitoring-subscribed", (e: MessageEvent) => {
      console.log(`[SSE-CLIENT][SUBSCRIBED] Connected to SSE stream for kelasPraktikumId: ${kelasPraktikumId}`)
      onStatus?.("connected")
      onReconnectSnapshot?.()
      try {
        const payload = JSON.parse(e.data) as MonitoringSseEvent
        onEvent(payload)
      } catch {
        // Silent catch for parse errors
      }
    })

    const handleMessage = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as MonitoringSseEvent
        console.log(`[SSE-CLIENT][EVENT] Received event: ${payload.type}`, payload)
        onEvent(payload)
      } catch {
        // Silent catch
      }
    }

    eventSource.addEventListener("student-monitoring-updated", handleMessage)
    eventSource.addEventListener("student-position-updated", handleMessage)
    eventSource.addEventListener("student-run-count-updated", handleMessage)

    eventSource.onerror = (err) => {
      console.warn(`[SSE-CLIENT][ERROR] SSE connection error/disconnected for kelasPraktikumId: ${kelasPraktikumId}`, err)
      onStatus?.("disconnected")
      if (eventSource) {
        eventSource.close()
      }
      // Automatic reconnect fallback after 3 seconds
      if (!isClosed) {
        setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    isClosed = true
    console.log(`[SSE-CLIENT][DISCONNECT] Closing SSE stream for kelasPraktikumId: ${kelasPraktikumId}`)
    onStatus?.("disconnected")
    if (eventSource) {
      eventSource.close()
    }
  }
}

