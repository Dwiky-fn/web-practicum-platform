type ChatEventCallback = (data: any) => void

export class ChatSocketClient {
  private token: string
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<ChatEventCallback>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(token: string) {
    this.token = token
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve()
        return
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const viteApiUrl = import.meta.env.VITE_API_URL
      const host = viteApiUrl
        ? new URL(viteApiUrl).host
        : window.location.host
      const wsUrl = `${protocol}//${host}/chat?token=${encodeURIComponent(this.token)}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.emitLocal("connected", true)
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.event) {
            this.emitLocal(payload.event, payload.data)
          }
        } catch {
          // Ignore invalid JSON
        }
      }

      this.ws.onclose = () => {
        this.emitLocal("connected", false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.emitLocal("connected", false)
        resolve()
      }
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, 4000)
  }

  public subscribeConversation(conversationId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "chat:subscribe",
          data: { conversationId },
        })
      )
    }
  }

  public sendMessage(conversationId: string, message: string, clientMessageId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "chat:message",
          data: { conversationId, message, clientMessageId },
        })
      )
    }
  }

  public markRead(conversationId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "chat:read",
          data: { conversationId },
        })
      )
    }
  }

  public on(event: string, callback: ChatEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  public off(event: string, callback: ChatEventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  private emitLocal(event: string, data: any) {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((cb) => cb(data))
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }
}
