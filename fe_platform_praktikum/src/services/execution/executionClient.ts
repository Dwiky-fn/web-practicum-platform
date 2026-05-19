import type { ExecutionClientMessage, ExecutionServerMessage } from "./types"

const DEFAULT_WS_URL = "ws://localhost:3000/execution"

export function getExecutionWsUrl() {
  return import.meta.env.VITE_EXECUTION_WS_URL || DEFAULT_WS_URL
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

  run(code: string) {
    this.close()

    this.socket = new WebSocket(getExecutionWsUrl())

    this.socket.addEventListener("open", () => {
      this.send({ type: "run", code })
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
    this.send({ type: "input", value })
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
