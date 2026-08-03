import { useEffect, useRef, useState } from "react"
import { MessageSquare, Send, X, AlertCircle, CheckCheck, Loader2 } from "lucide-react"
import {
  getOrCreateConversation,
  getChatMessages,
  sendChatMessage,
  markChatAsRead,
  type ChatConversation,
  type ChatMessage,
} from "../../../../../services/chat/chatService"
import { ChatSocketClient } from "../../../../../services/chat/chatSocket"
import { useCurrentUser } from "../../../../../services/user/useCurrentUser"
import { formatAcademicDateTime } from "../../../../../shared/utils/formatAcademicDateTime"

interface WorkspaceChatPanelProps {
  isOpen: boolean
  onClose: () => void
  kelasPraktikumId: string
  jobsheetId: string
}

export default function WorkspaceChatPanel({
  isOpen,
  onClose,
  kelasPraktikumId,
  jobsheetId,
}: WorkspaceChatPanelProps) {
  const { user } = useCurrentUser()
  const token = localStorage.getItem("authToken") || ""

  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [isWsConnected, setIsWsConnected] = useState(false)

  const chatSocketRef = useRef<ChatSocketClient | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load or create conversation
  useEffect(() => {
    if (!isOpen || !kelasPraktikumId || !jobsheetId || !user) return

    let isMounted = true

    async function initChat() {
      try {
        setLoading(true)
        setError("")
        const conv = await getOrCreateConversation({
          kelasPraktikumId,
          jobsheetId,
        })
        if (!isMounted) return
        setConversation(conv)

        const msgs = await getChatMessages(conv.id)
        if (!isMounted) return
        setMessages(msgs)
        scrollToBottom()

        await markChatAsRead(conv.id)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : "Gagal memuat percakapan chat")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initChat()

    return () => {
      isMounted = false
    }
  }, [isOpen, kelasPraktikumId, jobsheetId, user])

  // Setup WebSocket connection
  useEffect(() => {
    if (!isOpen || !token || !conversation) return

    const socket = new ChatSocketClient(token)
    chatSocketRef.current = socket

    socket.on("connected", (status: boolean) => {
      setIsWsConnected(status)
      if (status) {
        socket.subscribeConversation(conversation.id)
      }
    })

    socket.on("chat:message:new", (newMsg: ChatMessage) => {
      if (newMsg.conversation_id === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id))) {
            return prev.map((m) => (m.client_message_id === newMsg.client_message_id ? newMsg : m))
          }
          return [...prev, newMsg]
        })
        scrollToBottom()
        if (newMsg.sender_id !== user?.id) {
          markChatAsRead(conversation.id)
        }
      }
    })

    socket.on("chat:read", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === conversation.id) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, read_at: m.read_at || new Date().toISOString() }))
        )
      }
    })

    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [isOpen, token, conversation, user?.id])

  // Auto polling fallback every 3 seconds while chat panel is open
  useEffect(() => {
    if (!isOpen || !conversation?.id) return

    const interval = setInterval(async () => {
      try {
        const latestMsgs = await getChatMessages(conversation.id)
        setMessages((prev) => {
          if (
            latestMsgs.length !== prev.length ||
            (latestMsgs.length > 0 &&
              prev.length > 0 &&
              latestMsgs[latestMsgs.length - 1].id !== prev[prev.length - 1].id)
          ) {
            return latestMsgs
          }
          return prev
        })
      } catch {
        // Silently ignore polling error
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isOpen, conversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputMessage.trim()
    if (!text || !conversation || !user || sending) return

    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempMsg: ChatMessage = {
      id: clientMsgId,
      conversation_id: conversation.id,
      sender_id: user.id,
      client_message_id: clientMsgId,
      message: text,
      created_at: new Date().toISOString(),
      sender_name: user.fullname || "Mahasiswa",
      sender_role: user.role,
    }

    setMessages((prev) => [...prev, tempMsg])
    setInputMessage("")
    scrollToBottom()

    try {
      setSending(true)
      if (isWsConnected && chatSocketRef.current) {
        chatSocketRef.current.sendMessage(conversation.id, text, clientMsgId)
      } else {
        const sent = await sendChatMessage(conversation.id, {
          message: text,
          clientMessageId: clientMsgId,
        })
        setMessages((prev) =>
          prev.map((m) => (m.client_message_id === clientMsgId ? sent : m))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan")
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
      />

      {/* Main Container: Mobile Fullscreen Drawer / Desktop 380px Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-all duration-300 md:w-[380px] md:border-l border-gray-200">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-900 to-indigo-900 px-4 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-xs">
              <MessageSquare size={16} className="text-blue-200" />
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-blue-900 ${
                  isWsConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
                title={isWsConnected ? "Real-time WebSocket Aktif" : "Mode HTTP Sync Active"}
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-white">
                Chat Dosen: {conversation?.lecturer_name || "Dosen Pengampu"}
              </h3>
              <p className="truncate text-[10px] text-blue-200">
                Workspace Jobsheet Praktikum
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span>Memuat percakapan chat...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-400">
              <MessageSquare size={36} className="text-gray-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-gray-600">Belum ada pesan</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Kirim pesan ke dosen pengampu jika ada kendala saat mengerjakan jobsheet ini.
              </p>
            </div>
          )}

          {!loading &&
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                    }`}
                  >
                    {!isMe && (
                      <p className="font-bold text-[10px] text-blue-600 mb-0.5">
                        {msg.sender_name || "Dosen"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words font-sans">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-400">
                    <span>{formatAcademicDateTime(msg.created_at)}</span>
                    {isMe && (
                      <CheckCheck
                        size={12}
                        className={msg.read_at ? "text-blue-600 font-bold" : "text-gray-400"}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-gray-200 bg-white p-3 space-y-1.5"
        >
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Disampaikan ke Dosen</span>
            <span className={inputMessage.length > 1800 ? "text-amber-600 font-bold" : ""}>
              {inputMessage.length}/2000
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tulis pesan ke dosen..."
              maxLength={2000}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading || sending}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
