import { useEffect } from "react"
import { useChatNotification } from "../../../services/chat/ChatNotificationContext"

interface LecturerChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  kelasPraktikumId: string
  jobsheetId: string
  studentId?: string | null
  studentName?: string | null
  onRead?: () => void
  onOpenChat?: (targetStudentId?: string | null) => void
}

export default function LecturerChatDrawer({
  isOpen,
  kelasPraktikumId,
  jobsheetId,
  studentId,
}: LecturerChatDrawerProps) {
  const { openGlobalChat } = useChatNotification()

  useEffect(() => {
    if (isOpen) {
      openGlobalChat({
        studentId: studentId || undefined,
        kelasPraktikumId,
        jobsheetId,
      })
    }
  }, [isOpen, studentId, kelasPraktikumId, jobsheetId, openGlobalChat])

  return null
}
