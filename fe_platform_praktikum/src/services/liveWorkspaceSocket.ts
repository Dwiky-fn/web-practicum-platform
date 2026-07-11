const LIVE_WORKSPACE_WS_URL =
  import.meta.env.VITE_LIVE_WORKSPACE_WS_URL ?? "ws://localhost:3000/live-workspace"
const LIVE_WORKSPACE_DEBUG = import.meta.env.DEV && import.meta.env.VITE_LIVE_WORKSPACE_DEBUG === "true"

export type LiveWorkspaceRole = "student" | "lecturer-viewer"

export type LiveWorkspaceEvent = {
  type: string
  eventVersion?: number
  role?: LiveWorkspaceRole
  kelasPraktikumId?: string
  jobsheetId?: string
  studentId?: string
  roomId?: string
  workspaceVersion?: number
  baseVersion?: number
  nextVersion?: number
  filePath?: string
  oldFilePath?: string
  newFilePath?: string
  content?: string | unknown
  activeFilePath?: string
  sectionType?: "experiment" | "exercise" | "instruction" | string
  sectionId?: string | null
  sectionName?: string | null
  updatedAt?: string
  studentOnline?: boolean
  message?: string
}

type ConnectOptions = {
  role: LiveWorkspaceRole
  kelasPraktikumId: string
  jobsheetId: string
  studentId?: string
  onEvent: (event: LiveWorkspaceEvent) => void
  onStatus?: (status: "connecting" | "connected" | "reconnecting" | "disconnected") => void
  onResync?: () => void
}

function buildUrl() {
  const token = localStorage.getItem("authToken")
  if (!token) return null
  const url = new URL(LIVE_WORKSPACE_WS_URL)
  url.searchParams.set("token", token)
  return url
}

function parseEvent(raw: string): LiveWorkspaceEvent | null {
  try {
    const payload = JSON.parse(raw) as LiveWorkspaceEvent
    if (!payload?.type) return null
    return payload
  } catch {
    return null
  }
}

function debugLog(role: LiveWorkspaceRole, message: string, payload?: unknown) {
  if (!LIVE_WORKSPACE_DEBUG) return
  console.debug(`[LIVE-WS][${role === "student" ? "STUDENT" : "LECTURER"}] ${message}`, payload ?? "")
}

function errorLog(role: LiveWorkspaceRole, message: string, payload?: unknown) {
  console.error(`[LIVE-WS][${role === "student" ? "STUDENT" : "LECTURER"}] ${message}`, payload ?? "")
}

export function connectLiveWorkspaceSocket(options: ConnectOptions) {
  const url = buildUrl()
  if (!url) return { send: () => false, close: () => undefined, getVersion: () => 0 }

  let socket: WebSocket | null = null
  let closed = false
  let reconnectTimer: number | null = null
  let workspaceVersion = 0
  let everConnected = false
  let joined = false
  const pending: unknown[] = []

  const sendRaw = (payload: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || (!joined && (payload as { type?: string })?.type !== "join-live-workspace")) {
      debugLog(options.role, "socket not ready, queueing message", {
        type: (payload as { type?: string })?.type,
        readyState: socket?.readyState,
        joined,
      })
      pending.push(payload)
      return false
    }
    debugLog(options.role, "sending message", { type: (payload as { type?: string })?.type })
    socket.send(JSON.stringify(payload))
    return true
  }

  const join = () => {
    debugLog(options.role, "sending join room", {
      role: options.role,
      kelasPraktikumId: options.kelasPraktikumId,
      jobsheetId: options.jobsheetId,
      studentId: options.studentId,
    })
    sendRaw({
      type: "join-live-workspace",
      role: options.role,
      kelasPraktikumId: options.kelasPraktikumId,
      jobsheetId: options.jobsheetId,
      studentId: options.role === "lecturer-viewer" ? options.studentId : undefined,
    })
  }

  const flush = () => {
    while (pending.length && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(pending.shift()))
    }
  }

  const connect = () => {
    options.onStatus?.(everConnected ? "reconnecting" : "connecting")
    debugLog(options.role, "connecting", { host: url.host, pathname: url.pathname })
    socket = new WebSocket(url)

    socket.addEventListener("open", () => {
      debugLog(options.role, "socket open")
      everConnected = true
      joined = false
      join()
    })

    socket.addEventListener("message", (message) => {
      const event = parseEvent(message.data)
      if (!event) return
      debugLog(options.role, "message received", { type: event.type, workspaceVersion: event.workspaceVersion ?? event.nextVersion })
      if (event.type === "workspace-joined") {
        joined = true
        workspaceVersion = Number(event.workspaceVersion || 0)
        options.onStatus?.("connected")
        if (options.role === "lecturer-viewer") options.onResync?.()
        flush()
      }
      if (event.type === "workspace-patch-accepted") {
        workspaceVersion = Number(event.workspaceVersion || workspaceVersion)
      }
      if (event.type === "workspace-resync-required") {
        workspaceVersion = Number(event.workspaceVersion || workspaceVersion)
        options.onResync?.()
      }
      options.onEvent(event)
    })

    socket.addEventListener("close", () => {
      debugLog(options.role, "socket closed")
      joined = false
      options.onStatus?.("disconnected")
      if (!closed) {
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    })

    socket.addEventListener("error", () => {
      errorLog(options.role, "socket error")
      socket?.close()
    })
  }

  connect()

  return {
    send(payload: Omit<LiveWorkspaceEvent, "baseVersion" | "nextVersion"> & { baseVersion?: number; nextVersion?: number }) {
      const baseVersion = payload.baseVersion ?? workspaceVersion
      const nextVersion = payload.nextVersion ?? baseVersion + 1
      workspaceVersion = nextVersion
      return sendRaw({
        ...payload,
        kelasPraktikumId: options.kelasPraktikumId,
        jobsheetId: options.jobsheetId,
        baseVersion,
        nextVersion,
        updatedAt: payload.updatedAt || new Date().toISOString(),
      })
    },
    close() {
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      pending.length = 0
      sendRaw({ type: "leave-live-workspace" })
      socket?.close()
    },
    getVersion() {
      return workspaceVersion
    },
  }
}
