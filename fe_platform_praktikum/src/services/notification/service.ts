import { apiFetch } from "../api"
import type { Notification } from "./types"

export async function getNotifications(userId: string): Promise<Notification[]> {
  const res = await apiFetch(`/users/${userId}/notifications`)

  return res.data.notifications.map((notification: {
    id: string
    student_id: string
    title: string
    message: string
    is_read: boolean
  }) => ({
    id: notification.id,
    userId: notification.student_id,
    title: notification.title,
    message: notification.message,
    isRead: notification.is_read,
  }))
}
