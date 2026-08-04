import { apiFetch } from "../api"
import type { Notification } from "./types"

function getLocalReadMap(userId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`read_notifs_ts_${userId}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveLocalReadTimestamp(userId: string, notificationId?: string) {
  try {
    const map = getLocalReadMap(userId)
    const now = Date.now()
    if (notificationId) {
      if (!map[notificationId]) map[notificationId] = now
    }
    localStorage.setItem(`read_notifs_ts_${userId}`, JSON.stringify(map))
  } catch {
    // Ignore storage errors
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const readMap = getLocalReadMap(userId)

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
    }) => {
      const id = String(notification.id)
      const isRead = Boolean(notification.is_read ?? notification.isRead) || Boolean(readMap[id])
      const readAtTimestamp = isRead ? (readMap[id] || Date.now()) : null

      return {
        id,
        userId: notification.student_id || notification.userId || userId,
        title: notification.title || "Notifikasi",
        message: notification.message || "",
        targetUrl: notification.target_url || notification.targetUrl,
        isRead,
        readAtTimestamp,
      }
    })
  } catch {
    return []
  }
}

export async function markNotificationsAsRead(userId: string, notificationId?: string): Promise<void> {
  saveLocalReadTimestamp(userId, notificationId)

  try {
    await apiFetch(`/users/${userId}/notifications/read`, {
      method: "PATCH",
      body: JSON.stringify({ notificationId }),
    })
  } catch {
    // Ignore API error gracefully
  }
}
