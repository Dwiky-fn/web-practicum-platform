import { useEffect, useRef, useState } from "react"
import {
  MessageSquare,
  Send,
  X,
  AlertCircle,
  CheckCheck,
  Loader2,
  User,
  ArrowLeft,
  BookOpen,
  Users,
} from "lucide-react"
import {
  getOrCreateConversation,
  getLecturerClasses,
  getLecturerJobsheets,
  getLecturerStudents,
  getChatMessages,
  sendChatMessage,
  markChatAsRead,
  type ChatConversation,
  type ChatMessage,
  type LecturerClassItem,
  type LecturerJobsheetItem,
  type LecturerStudentItem,
} from "../../services/chat/chatService"
import { ChatSocketClient } from "../../services/chat/chatSocket"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import { formatAcademicDateTime } from "../../shared/utils/formatAcademicDateTime"

interface GlobalChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  conversationId?: string | null
  studentId?: string | null
  kelasPraktikumId?: string | null
  jobsheetId?: string | null
  resetKey?: number
}

type Mode = "mode1" | "mode2" | "mode3"
type Step = "classes" | "jobsheets" | "students" | "messages"

export default function GlobalChatDrawer({
  isOpen,
  onClose,
  conversationId,
  studentId,
  kelasPraktikumId,
  jobsheetId,
  resetKey,
}: GlobalChatDrawerProps) {
  const { user } = useCurrentUser()
  const token = localStorage.getItem("authToken") || ""

  const [mode, setMode] = useState<Mode>("mode3")
  const [step, setStep] = useState<Step>("classes")

  const [classesList, setClassesList] = useState<LecturerClassItem[]>([])
  const [jobsheetsList, setJobsheetsList] = useState<LecturerJobsheetItem[]>([])
  const [studentsList, setStudentsList] = useState<LecturerStudentItem[]>([])

  const [selectedClass, setSelectedClass] = useState<LecturerClassItem | null>(null)
  const [selectedJobsheet, setSelectedJobsheet] = useState<LecturerJobsheetItem | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<LecturerStudentItem | null>(null)

  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [isWsConnected, setIsWsConnected] = useState(false)

  const chatSocketRef = useRef<ChatSocketClient | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Determine Context Priority (Mode 1, Mode 2, or Mode 3) on open
  useEffect(() => {
    if (!isOpen || !user || !token) return

    let isMounted = true

    async function initDrawer() {
      try {
        setLoading(true)
        setError("")

        // ----------------------------------------------------
        // MAHASISWA ROLE: Direct thread view for student
        // ----------------------------------------------------
        if (user?.role === "MAHASISWA") {
          setMode("mode2")
          setStep("messages")
          if (conversationId) {
            const msgs = await getChatMessages(conversationId)
            if (!isMounted) return
            setMessages(msgs)
            setActiveConversation({ id: conversationId } as ChatConversation)
            scrollToBottom()
            await markChatAsRead(conversationId)
          } else if (kelasPraktikumId && jobsheetId) {
            const conv = await getOrCreateConversation({ kelasPraktikumId, jobsheetId })
            if (!isMounted) return
            setActiveConversation(conv)
            const msgs = await getChatMessages(conv.id)
            if (!isMounted) return
            setMessages(msgs)
            scrollToBottom()
            await markChatAsRead(conv.id)
          }
          return
        }

        // ----------------------------------------------------
        // DOSEN ROLE: Check Context Priority
        // ----------------------------------------------------

        // PRIORITY 1 (MODE 2): Monitoring Single Student (kelasPraktikumId + jobsheetId + studentId)
        if (kelasPraktikumId && jobsheetId && studentId) {
          setMode("mode2")
          setStep("messages")
          const conv = await getOrCreateConversation({
            studentId,
            kelasPraktikumId,
            jobsheetId,
          })
          if (!isMounted) return
          setActiveConversation(conv)
          const msgs = await getChatMessages(conv.id)
          if (!isMounted) return
          setMessages(msgs)
          scrollToBottom()
          await markChatAsRead(conv.id)
          return
        }

        // PRIORITY 2 (MODE 1): Monitoring Jobsheet (kelasPraktikumId + jobsheetId)
        if (kelasPraktikumId && jobsheetId) {
          setMode("mode1")
          setStep("students")
          const studs = await getLecturerStudents(kelasPraktikumId, jobsheetId)
          if (!isMounted) return
          setStudentsList(studs)

          // If a specific conversationId was requested via notification, open messages directly
          if (conversationId) {
            setStep("messages")
            const msgs = await getChatMessages(conversationId)
            if (!isMounted) return
            setMessages(msgs)
            setActiveConversation({ id: conversationId } as ChatConversation)
            scrollToBottom()
            await markChatAsRead(conversationId)
          }
          return
        }

        // PRIORITY 3 (MODE 3): No Context (Dashboard / Header Icon) -> Drill-down (Class -> Jobsheet -> Student -> Chat)
        setMode("mode3")
        setStep("classes")
        setSelectedClass(null)
        setSelectedJobsheet(null)
        setSelectedStudent(null)
        setActiveConversation(null)
        setMessages([])

        const classes = await getLecturerClasses()
        if (!isMounted) return
        setClassesList(classes)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : "Gagal memuat percakapan chat")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initDrawer()

    return () => {
      isMounted = false
    }
  }, [isOpen, conversationId, studentId, kelasPraktikumId, jobsheetId, resetKey, user, token])

  // MODE 3 STEP 1: Select Class -> Fetch Jobsheets
  const handleSelectClass = async (cls: LecturerClassItem) => {
    try {
      setSelectedClass(cls)
      setStep("jobsheets")
      setLoading(true)
      setError("")
      const jobsheets = await getLecturerJobsheets(cls.kelas_praktikum_id)
      setJobsheetsList(jobsheets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar jobsheet")
    } finally {
      setLoading(false)
    }
  }

  // MODE 3 STEP 2: Select Jobsheet -> Fetch Students
  const handleSelectJobsheet = async (jb: LecturerJobsheetItem) => {
    if (!selectedClass) return
    try {
      setSelectedJobsheet(jb)
      setStep("students")
      setLoading(true)
      setError("")
      const studs = await getLecturerStudents(selectedClass.kelas_praktikum_id, jb.jobsheet_id)
      setStudentsList(studs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar mahasiswa")
    } finally {
      setLoading(false)
    }
  }

  // MODE 1 & MODE 3 STEP 3: Select Student -> Open Conversation
  const handleSelectStudent = async (stud: LecturerStudentItem) => {
    const targetKpId = selectedClass?.kelas_praktikum_id || kelasPraktikumId || ""
    const targetJobId = selectedJobsheet?.jobsheet_id || jobsheetId || ""

    try {
      setSelectedStudent(stud)
      setStep("messages")
      setLoading(true)
      setError("")

      const conv = await getOrCreateConversation({
        studentId: stud.student_id,
        kelasPraktikumId: targetKpId,
        jobsheetId: targetJobId,
      })
      setActiveConversation(conv)
      const msgs = await getChatMessages(conv.id)
      setMessages(msgs)
      scrollToBottom()
      await markChatAsRead(conv.id)

      // Realtime unread reduction on read
      const readCount = stud.unread_count || 0
      if (readCount > 0) {
        setStudentsList((prev) =>
          prev.map((s) => (s.student_id === stud.student_id ? { ...s, unread_count: 0 } : s))
        )
        if (selectedJobsheet) {
          setJobsheetsList((prev) =>
            prev.map((j) =>
              j.jobsheet_id === selectedJobsheet.jobsheet_id
                ? { ...j, unread_count: Math.max(0, j.unread_count - readCount) }
                : j
            )
          )
        }
        if (selectedClass) {
          setClassesList((prev) =>
            prev.map((c) =>
              c.kelas_praktikum_id === selectedClass.kelas_praktikum_id
                ? { ...c, unread_count: Math.max(0, c.unread_count - readCount) }
                : c
            )
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka percakapan")
    } finally {
      setLoading(false)
    }
  }

  // Back Navigation Handler
  const handleBack = () => {
    if (mode === "mode1") {
      if (step === "messages") setStep("students")
      return
    }

    if (mode === "mode3") {
      if (step === "messages") setStep("students")
      else if (step === "students") setStep("jobsheets")
      else if (step === "jobsheets") setStep("classes")
    }
  }

  // WebSocket Connection
  useEffect(() => {
    if (!isOpen || !token || !activeConversation?.id) return

    const socket = new ChatSocketClient(token)
    chatSocketRef.current = socket

    socket.on("connected", (status: boolean) => {
      setIsWsConnected(status)
      if (status && activeConversation.id) {
        socket.subscribeConversation(activeConversation.id)
      }
    })

    socket.on("chat:message:new", (newMsg: ChatMessage) => {
      if (newMsg.conversation_id === activeConversation.id) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.id === newMsg.id ||
                (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id)
            )
          ) {
            return prev.map((m) => (m.client_message_id === newMsg.client_message_id ? newMsg : m))
          }
          return [...prev, newMsg]
        })
        scrollToBottom()
        if (newMsg.sender_id !== user?.id) {
          markChatAsRead(activeConversation.id)
        }
      }
    })

    socket.on("chat:read", ({ conversationId: convId }: { conversationId: string }) => {
      if (convId === activeConversation.id) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, read_at: m.read_at || new Date().toISOString() }))
        )
      }
    })

    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [isOpen, token, activeConversation?.id, user?.id])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputMessage.trim()
    if (!text || !activeConversation?.id || !user || sending) return

    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const tempMsg: ChatMessage = {
      id: clientMsgId,
      conversation_id: activeConversation.id,
      sender_id: user.id,
      client_message_id: clientMsgId,
      message: text,
      created_at: new Date().toISOString(),
      sender_name: user.fullname || (user.role === "DOSEN" ? "Dosen" : "Mahasiswa"),
      sender_role: user.role,
    }

    setMessages((prev) => [...prev, tempMsg])
    setInputMessage("")
    scrollToBottom()

    if (isWsConnected && chatSocketRef.current) {
      chatSocketRef.current.sendMessage(activeConversation.id, text, clientMsgId)
    }

    try {
      setSending(true)
      const res = await sendChatMessage(activeConversation.id, {
        message: text,
        clientMessageId: clientMsgId,
      })
      setMessages((prev) =>
        prev.map((m) => (m.client_message_id === clientMsgId ? res : m))
      )
    } catch {
      setError("Pesan gagal terkirim. Klik untuk mencoba lagi.")
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  // Header Titles based on Mode and Step
  let headerTitle = "Chat Mahasiswa"
  let headerSub = "Monitoring Jobsheet Praktikum"
  let showBackButton = false

  if (user?.role === "MAHASISWA") {
    headerTitle = `Chat Dosen: ${activeConversation?.lecturer_name || "Dosen Pengampu"}`
    headerSub = "Workspace Jobsheet Praktikum"
  } else if (mode === "mode2") {
    headerTitle = `Chat Mahasiswa: ${activeConversation?.student_name || "Mahasiswa"}`
    headerSub = "Monitoring Jobsheet Praktikum"
  } else if (mode === "mode1") {
    if (step === "students") {
      headerTitle = "Chat Mahasiswa"
      headerSub = "Monitoring Jobsheet Praktikum"
    } else if (step === "messages") {
      headerTitle = `Chat Mahasiswa: ${selectedStudent?.student_name || activeConversation?.student_name || "Mahasiswa"}`
      headerSub = "Monitoring Jobsheet Praktikum"
      showBackButton = true
    }
  } else if (mode === "mode3") {
    headerSub = "Daftar Mahasiswa yang Sudah Chat"
    if (step === "classes") {
      headerTitle = "Chat Mahasiswa"
    } else if (step === "jobsheets") {
      headerTitle = `← ${selectedClass?.nama_kelas || selectedClass?.kelas_nama}`
      showBackButton = true
    } else if (step === "students") {
      headerTitle = `← ${selectedJobsheet?.jobsheet_title}`
      showBackButton = true
    } else if (step === "messages") {
      headerTitle = `← Chat Mahasiswa: ${selectedStudent?.student_name || activeConversation?.student_name || "Mahasiswa"}`
      showBackButton = true
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Floating Popup Card Panel */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex w-[calc(100vw-2rem)] sm:w-[400px] md:w-[420px] h-[550px] max-h-[88vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        {/* Header Bar */}
        <div className="flex h-13 shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-4 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            {showBackButton ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 font-bold text-xs">
                <User size={14} className="text-blue-200" />
                <span
                  className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-blue-900 ${
                    isWsConnected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                  title={isWsConnected ? "Real-time WebSocket Active" : "Mode Sync Active"}
                />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-white">{headerTitle}</h3>
              <p className="truncate text-[10px] text-blue-200">{headerSub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
            title="Tutup Chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY CONTENT AREA */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/60">
          {error && (
            <div className="m-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 shrink-0">
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <Loader2 size={22} className="animate-spin text-blue-600" />
              <span>Memuat data...</span>
            </div>
          ) : (
            <>
              {/* MODE 3 STEP 1: CLASS LIST */}
              {mode === "mode3" && step === "classes" && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                  {classesList.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-400">
                      <Users size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-gray-600">Belum ada kelas</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Anda belum memiliki kelas praktikum yang diampu.
                      </p>
                    </div>
                  ) : (
                    classesList.map((cls) => (
                      <button
                        key={cls.kelas_praktikum_id}
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-xs transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-blue-700">
                            <Users size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {cls.nama_kelas || cls.kelas_nama}
                            </p>
                            <p className="truncate text-[10px] text-gray-500 mt-0.5">
                              {cls.mata_kuliah_nama}
                            </p>
                          </div>
                        </div>
                        {/* Unread count badge without parentheses, hidden if 0 */}
                        {Boolean(cls.unread_count) && cls.unread_count > 0 && (
                          <div className="flex items-center shrink-0 ml-2">
                            <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                              {cls.unread_count}
                            </span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* MODE 3 STEP 2: JOBSHEET LIST */}
              {mode === "mode3" && step === "jobsheets" && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                  {jobsheetsList.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-400">
                      <BookOpen size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-gray-600">Belum ada jobsheet</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Belum ada jobsheet aktif pada kelas ini.
                      </p>
                    </div>
                  ) : (
                    jobsheetsList.map((jb) => (
                      <button
                        key={jb.jobsheet_id}
                        type="button"
                        onClick={() => handleSelectJobsheet(jb)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-xs transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-xs text-indigo-700">
                            <BookOpen size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {jb.jobsheet_title}
                            </p>
                          </div>
                        </div>
                        {/* Unread count badge without parentheses, hidden if 0 */}
                        {Boolean(jb.unread_count) && jb.unread_count > 0 && (
                          <div className="flex items-center shrink-0 ml-2">
                            <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              {jb.unread_count}
                            </span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* MODE 1 & MODE 3 STEP 3: STUDENT LIST */}
              {step === "students" && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                  {studentsList.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-400">
                      <MessageSquare size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-gray-600">Belum ada percakapan</p>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                        Belum ada mahasiswa yang mengirim pesan pada jobsheet ini.
                      </p>
                    </div>
                  ) : (
                    studentsList.map((stud) => (
                      <button
                        key={stud.student_id}
                        type="button"
                        onClick={() => handleSelectStudent(stud)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-xs transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-blue-700">
                            {stud.student_name?.[0]?.toUpperCase() || <User size={15} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">
                                {stud.student_name}
                              </span>
                              {stud.student_nim && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  ({stud.student_nim})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          {stud.last_message_at && (
                            <span className="text-[9px] text-gray-400">
                              {formatAcademicDateTime(stud.last_message_at)}
                            </span>
                          )}
                          {/* Unread count badge without parentheses, hidden if 0 */}
                          {Boolean(stud.unread_count) && stud.unread_count > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              {stud.unread_count}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* STEP 4: MESSAGES THREAD */}
              {step === "messages" && (
                <div className="flex-1 flex flex-col min-h-0">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
                      <MessageSquare size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-gray-600">Belum ada pesan</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Tulis pesan pertama Anda di bawah ini untuk memulai percakapan.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                      {messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id || index}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-[10px] font-semibold text-gray-500">
                                {isMe ? "Anda" : msg.sender_name || headerTitle}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                {formatAcademicDateTime(msg.created_at)}
                              </span>
                            </div>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed break-words ${
                                isMe
                                  ? "bg-blue-600 text-white rounded-br-none"
                                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                              }`}
                            >
                              {msg.message}
                            </div>
                            {isMe && (
                              <div className="mt-0.5 flex items-center gap-1 px-1 text-[9px] text-gray-400">
                                {msg.read_at ? (
                                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                    <CheckCheck size={12} /> Dibaca
                                  </span>
                                ) : (
                                  <span>Terkirim</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* Input Form */}
                  <form onSubmit={handleSend} className="border-t border-gray-100 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={
                          user?.role === "MAHASISWA"
                            ? "Tulis pesan ke dosen..."
                            : "Tulis pesan ke mahasiswa..."
                        }
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none disabled:bg-gray-100 transition"
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || sending}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
                        title="Kirim Pesan"
                      >
                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
