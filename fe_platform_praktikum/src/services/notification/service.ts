import { apiFetch } from "../api"
import type { Notification } from "./types"

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const res = await apiFetch(`/users/${userId}/notifications`)

    return res.data.notifications.map((notification: {
      id: string
      student_id: string
      title: string
      message: string
      target_url?: string
      targetUrl?: string
      is_read: boolean
    }) => ({
      id: notification.id,
      userId: notification.student_id,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.target_url || notification.targetUrl,
      isRead: notification.is_read,
    }))
  } catch {
    return []
  }
}

export async function markNotificationsAsRead(userId: string): Promise<void> {
  try {
    await apiFetch(`/users/${userId}/notifications/read`, {
      method: "PATCH",
    })
  } catch {
    // Ignore API error gracefully
  }
}
