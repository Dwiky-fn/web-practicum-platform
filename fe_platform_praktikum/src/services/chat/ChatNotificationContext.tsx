import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { ChatSocketClient } from "./chatSocket"
import { toast } from "../../components/toast/toastStore"
import { useCurrentUser } from "../user/useCurrentUser"
import type { ChatMessage } from "./chatService"
import GlobalChatDrawer from "../../components/chat/GlobalChatDrawer"

export interface ActiveChatState {
  isChatOpen: boolean
  conversationId?: string | null
  studentId?: string | null
  kelasPraktikumId?: string | null
  jobsheetId?: string | null
  openChatDrawer?: (studentId?: string | null) => void
}

export interface GlobalChatTarget {
  isOpen: boolean
  conversationId?: string | null
  studentId?: string | null
  kelasPraktikumId?: string | null
  jobsheetId?: string | null
  resetKey?: number
}

interface ChatNotificationContextType {
  activeChatState: ActiveChatState
  setActiveChatState: React.Dispatch<React.SetStateAction<ActiveChatState>>
  chatSocket: ChatSocketClient | null
  unreadTotal: number
  setUnreadTotal: React.Dispatch<React.SetStateAction<number>>
  openGlobalChat: (target?: {
    conversationId?: string
    studentId?: string
    kelasPraktikumId?: string
    jobsheetId?: string
  }) => void
  closeGlobalChat: () => void
}

const ChatNotificationContext = createContext<ChatNotificationContextType>({
  activeChatState: { isChatOpen: false },
  setActiveChatState: () => {},
  chatSocket: null,
  unreadTotal: 0,
  setUnreadTotal: () => {},
  openGlobalChat: () => {},
  closeGlobalChat: () => {},
})

export function ChatNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser()
  const token = localStorage.getItem("authToken") || ""

  const [activeChatState, setActiveChatState] = useState<ActiveChatState>({ isChatOpen: false })
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [globalChatTarget, setGlobalChatTarget] = useState<GlobalChatTarget>({ isOpen: false })

  const socketRef = useRef<ChatSocketClient | null>(null)
  const processedMessageIdsRef = useRef<Set<string>>(new Set())

  const openGlobalChat = useCallback(
    (target?: {
      conversationId?: string
      studentId?: string
      kelasPraktikumId?: string
      jobsheetId?: string
    }) => {
      const isEvent = target && typeof target === "object" && ("nativeEvent" in target || "preventDefault" in target)
      const cleanTarget = isEvent ? undefined : target

      setGlobalChatTarget({
        isOpen: true,
        conversationId: cleanTarget?.conversationId || null,
        studentId: cleanTarget?.studentId || null,
        kelasPraktikumId: cleanTarget?.kelasPraktikumId || null,
        jobsheetId: cleanTarget?.jobsheetId || null,
        resetKey: Date.now(),
      })
    },
    []
  )

  const closeGlobalChat = useCallback(() => {
    setGlobalChatTarget({ isOpen: false })
  }, [])

  // Maintain activeChatState ref for event listeners without re-subscribing
  const activeChatStateRef = useRef<ActiveChatState>(activeChatState)
  useEffect(() => {
    activeChatStateRef.current = activeChatState
  }, [activeChatState])

  // Maintain globalChatTarget ref
  const globalChatTargetRef = useRef<GlobalChatTarget>(globalChatTarget)
  useEffect(() => {
    globalChatTargetRef.current = globalChatTarget
  }, [globalChatTarget])

  const userId = user?.id
  const userRole = user?.role

  useEffect(() => {
    if (!userId || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = new ChatSocketClient(token)
    socketRef.current = socket
    socket.connect()

    const handleNewNotification = (msg: ChatMessage) => {
      if (!msg || !msg.id) return

      // Deduplication: check if message ID was already processed
      if (processedMessageIdsRef.current.has(msg.id)) return
      processedMessageIdsRef.current.add(msg.id)

      // Limit memory size of set
      if (processedMessageIdsRef.current.size > 500) {
        const firstValue = processedMessageIdsRef.current.values().next().value
        if (firstValue) processedMessageIdsRef.current.delete(firstValue)
      }

      // Ignore self-sent messages
      if (msg.sender_id === userId) return

      const currentActive = activeChatStateRef.current
      const currentGlobal = globalChatTargetRef.current

      // Check if user is currently viewing THIS specific chat conversation (either page panel or global drawer)
      const isViewingActiveConv =
        (currentActive.isChatOpen &&
          ((currentActive.conversationId && currentActive.conversationId === msg.conversation_id) ||
            (currentActive.studentId && currentActive.studentId === msg.sender_id))) ||
        (currentGlobal.isOpen &&
          ((currentGlobal.conversationId && currentGlobal.conversationId === msg.conversation_id) ||
            (currentGlobal.studentId && currentGlobal.studentId === msg.sender_id)))

      if (isViewingActiveConv) {
        // User is currently viewing this exact conversation -> DO NOT show intrusive toast pop-up!
        return
      }

      // Context-aware check for MAHASISWA role:
      if (userRole === "MAHASISWA") {
        const conv = (msg as any).conversation
        const msgJobsheetId = conv?.jobsheet_id || (msg as any).jobsheet_id
        const msgKelasPraktikumId = conv?.kelas_praktikum_id || (msg as any).kelas_praktikum_id

        // Check if student is currently on a Workpage matching this message's context
        const isCurrentWorkpageMatching =
          Boolean(currentActive.jobsheetId) &&
          (currentActive.jobsheetId === msgJobsheetId ||
           (Boolean(msg.conversation_id) && currentActive.conversationId === msg.conversation_id) ||
           (Boolean(currentActive.kelasPraktikumId) && currentActive.kelasPraktikumId === msgKelasPraktikumId))

        // If student is NOT on the matching Workpage (e.g. on Dashboard, Mata Kuliah, or different Workpage), DO NOT show toast!
        if (!isCurrentWorkpageMatching) {
          return
        }
      }

      // User is on a matching page or Dosen -> Trigger pop-up notification toast!
      const senderName = msg.sender_name || (userRole === "DOSEN" ? "Mahasiswa" : "Dosen Praktikum")
      const snippet = msg.message?.length > 70 ? `${msg.message.slice(0, 70)}...` : msg.message

      toast.chat({
        senderName,
        senderAvatar: msg.sender_avatar,
        message: snippet || "Mengirim pesan chat baru",
        onClick: () => {
          const latestActive = activeChatStateRef.current
          const conv = (msg as any).conversation
          const conversationId = msg.conversation_id
          const studentId = conv?.student_id || msg.sender_id
          const kelasPraktikumId = conv?.kelas_praktikum_id || latestActive.kelasPraktikumId
          const jobsheetId = conv?.jobsheet_id || latestActive.jobsheetId

          // 1. If page has registered openChatDrawer callback (e.g. WorkPage / WorkspaceChatPanel / LecturerPage), open that UI directly!
          if (latestActive.openChatDrawer) {
            latestActive.openChatDrawer(studentId)
            return
          }

          // 2. Otherwise open GlobalChatDrawer without route changes or page refresh
          openGlobalChat({
            conversationId,
            studentId,
            kelasPraktikumId,
            jobsheetId,
          })
        },
      })
    }

    socket.on("chat:notification:new", handleNewNotification)
    socket.on("chat:message:new", handleNewNotification)

    return () => {
      socket.off("chat:notification:new", handleNewNotification)
      socket.off("chat:message:new", handleNewNotification)
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, userRole, token, openGlobalChat])

  return (
    <ChatNotificationContext.Provider
      value={{
        activeChatState,
        setActiveChatState,
        chatSocket: socketRef.current,
        unreadTotal,
        setUnreadTotal,
        openGlobalChat,
        closeGlobalChat,
      }}
    >
      {children}
      <GlobalChatDrawer
        isOpen={globalChatTarget.isOpen}
        onClose={closeGlobalChat}
        conversationId={globalChatTarget.conversationId}
        studentId={globalChatTarget.studentId}
        kelasPraktikumId={globalChatTarget.kelasPraktikumId}
        jobsheetId={globalChatTarget.jobsheetId}
        resetKey={globalChatTarget.resetKey}
      />
    </ChatNotificationContext.Provider>
  )
}

export function useChatNotification() {
  return useContext(ChatNotificationContext)
}
