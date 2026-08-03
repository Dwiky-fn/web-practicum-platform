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

export async function getOrCreateConversation(payload: {
  studentId?: string
  lecturerId?: string
  kelasPraktikumId: string
  jobsheetId: string
}): Promise<ChatConversation> {
  const response = await apiFetch("/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return response.data.conversation
}

export async function getLecturerConversations(params: {
  kelasPraktikumId: string
  jobsheetId: string
}): Promise<ChatConversation[]> {
  const response = await apiFetch(
    `/chat/conversations?kelasPraktikumId=${params.kelasPraktikumId}&jobsheetId=${params.jobsheetId}`
  )
  return response.data.conversations || []
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
