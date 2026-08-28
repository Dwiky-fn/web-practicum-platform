import type { ExecutionClientMessage, ExecutionServerMessage } from "./types"

function getBaseExecutionWsUrl() {
  const envUrl = import.meta.env.VITE_EXECUTION_WS_URL
  if (envUrl) return envUrl
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}/execution`
  }
  return "ws://localhost:3000/execution"
}

export interface RunExecutionPayload {
  language: string
  code: string
  files?: { path: string; content: string }[]
  mainClass?: string
  entryFile?: string
  executionId?: string
  context?: Extract<ExecutionClientMessage, { type: "run" }>["context"]
}

export function getExecutionWsUrl() {
  const token = localStorage.getItem("authToken")
  const baseUrl = getBaseExecutionWsUrl()

  if (!token) {
    return baseUrl
  }

  const url = new URL(baseUrl)
  url.searchParams.set("token", token)

  return url.toString()
}

export class ExecutionClient {
  private socket: WebSocket | null = null
  private readonly handlers: {
    onMessage: (message: ExecutionServerMessage) => void
    onError: (message: string) => void
    onClose: () => void
  }

  constructor(handlers: {
    onMessage: (message: ExecutionServerMessage) => void
    onError: (message: string) => void
    onClose: () => void
  }) {
    this.handlers = handlers
  }

  run(payload: RunExecutionPayload) {
    this.close()

    this.socket = new WebSocket(getExecutionWsUrl())

    this.socket.addEventListener("open", () => {
      this.send({ type: "run", ...payload })
    })

    this.socket.addEventListener("message", (event) => {
      this.handlers.onMessage(JSON.parse(event.data) as ExecutionServerMessage)
    })

    this.socket.addEventListener("error", () => {
      this.handlers.onError("Gagal terhubung ke backend execution gateway")
    })

    this.socket.addEventListener("close", () => {
      this.handlers.onClose()
    })
  }

  sendInput(value: string) {
    this.send({ type: "stdin", data: value })
  }

  stop() {
    this.send({ type: "stop" })
  }

  close() {
    this.socket?.close()
    this.socket = null
  }

  private send(message: ExecutionClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return

    this.socket.send(JSON.stringify(message))
  }
}
