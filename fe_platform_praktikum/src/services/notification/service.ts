import { apiFetch } from "../api"
import type { Notification } from "./types"

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const res = await apiFetch(`/users/${userId}/notifications`)
    const rawList = res?.data?.notifications || res?.notifications || res?.data || (Array.isArray(res) ? res : [])

    if (!Array.isArray(rawList)) return []

    return rawList.map((notification: {
      id: string
      student_id?: string
      userId?: string
      title: string
      message: string
      target_url?: string
      targetUrl?: string
      is_read?: boolean
      isRead?: boolean
    }) => ({
      id: String(notification.id),
      userId: notification.student_id || notification.userId || userId,
      title: notification.title || "Notifikasi",
      message: notification.message || "",
      targetUrl: notification.target_url || notification.targetUrl,
      isRead: Boolean(notification.is_read ?? notification.isRead),
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
