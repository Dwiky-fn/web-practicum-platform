import { apiFetch } from "../api"

export interface ChatConversation {
  id: string
  student_id: string
  lecturer_id: string
  kelas_praktikum_id: string
  jobsheet_id: string
  created_at: string
  updated_at: string
  last_message_at: string
  student_name?: string
  student_nim?: string
  student_avatar?: string
  lecturer_name?: string
  lecturer_avatar?: string
  last_message?: string
  unread_count?: number
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  client_message_id?: string
  message: string
  created_at: string
  read_at?: string | null
  sender_name?: string
  sender_role?: string
  sender_avatar?: string
}

export interface EligibleStudent {
  id: string
  name: string
  username: string
  avatar_url?: string
  nim: string
  kelas_praktikum_id: string
  mata_kuliah_nama?: string
  kelas_nama?: string
}

export interface LecturerClassItem {
  kelas_praktikum_id: string
  mata_kuliah_nama: string
  kelas_nama: string
  nama_kelas: string
  unread_count: number
}

export interface LecturerJobsheetItem {
  jobsheet_id: string
  jobsheet_title: string
  kelas_praktikum_id: string
  unread_count: number
}

export interface LecturerStudentItem {
  conversation_id: string
  student_id: string
  student_name: string
  student_nim?: string
  student_avatar?: string
  unread_count: number
  last_message_at: string
}

export async function getOrCreateConversation(payload: {
  studentId?: string
  lecturerId?: string
  kelasPraktikumId?: string
  jobsheetId?: string
}): Promise<ChatConversation> {
  const response = await apiFetch("/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return response.data.conversation
}

export async function getLecturerConversations(params?: {
  kelasPraktikumId?: string
  jobsheetId?: string
}): Promise<ChatConversation[]> {
  const search = new URLSearchParams()
  if (params?.kelasPraktikumId) search.set("kelasPraktikumId", params.kelasPraktikumId)
  if (params?.jobsheetId) search.set("jobsheetId", params.jobsheetId)
  const url = search.toString() ? `/chat/conversations?${search.toString()}` : "/chat/conversations"

  const response = await apiFetch(url)
  return response.data.conversations || []
}

export async function getEligibleStudents(searchQuery?: string): Promise<EligibleStudent[]> {
  let url = "/chat/eligible-students"
  if (searchQuery && searchQuery.trim()) {
    url += `?search=${encodeURIComponent(searchQuery.trim())}`
  }
  const response = await apiFetch(url)
  return response.data.students || []
}

export async function getChatMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<ChatMessage[]> {
  let url = `/chat/conversations/${conversationId}/messages`
  const search = new URLSearchParams()
  if (options?.limit) search.set("limit", String(options.limit))
  if (options?.before) search.set("before", options.before)
  if (search.toString()) url += `?${search.toString()}`

  const response = await apiFetch(url)
  return response.data.messages || []
}

export async function sendChatMessage(
  conversationId: string,
  payload: { message: string; clientMessageId?: string }
): Promise<ChatMessage> {
  const response = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return response.data.message
}

export async function markChatAsRead(conversationId: string): Promise<void> {
  await apiFetch(`/chat/conversations/${conversationId}/read`, {
    method: "PATCH",
  })
}

export async function getChatUnreadCount(params?: {
  kelasPraktikumId?: string
  jobsheetId?: string
}): Promise<{ totalUnread: number; studentUnreadMap?: Record<string, number> }> {
  let url = "/chat/unread-count"
  const search = new URLSearchParams()
  if (params?.kelasPraktikumId) search.set("kelasPraktikumId", params.kelasPraktikumId)
  if (params?.jobsheetId) search.set("jobsheetId", params.jobsheetId)
  if (search.toString()) url += `?${search.toString()}`

  const response = await apiFetch(url)
  return response.data
}

export async function getLecturerClasses(): Promise<LecturerClassItem[]> {
  const response = await apiFetch("/chat/lecturer/classes")
  return response.data.classes || []
}

export async function getLecturerJobsheets(kelasPraktikumId: string): Promise<LecturerJobsheetItem[]> {
  const response = await apiFetch(`/chat/lecturer/jobsheets?kelasPraktikumId=${kelasPraktikumId}`)
  return response.data.jobsheets || []
}

export async function getLecturerStudents(
  kelasPraktikumId: string,
  jobsheetId: string
): Promise<LecturerStudentItem[]> {
  const response = await apiFetch(
    `/chat/lecturer/students?kelasPraktikumId=${kelasPraktikumId}&jobsheetId=${jobsheetId}`
  )
  return response.data.students || []
}
