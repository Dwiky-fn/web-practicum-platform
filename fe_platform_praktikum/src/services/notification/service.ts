import { apiFetch } from "../api"
import type { Notification } from "./types"

function getLocalReadIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`read_notifs_${userId}`)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveLocalReadId(userId: string, notificationId?: string) {
  try {
    const localSet = getLocalReadIds(userId)
    if (notificationId) {
      localSet.add(notificationId)
    }
    localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(Array.from(localSet)))
  } catch {
    // Ignore storage errors
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const localReadSet = getLocalReadIds(userId)

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
      const isRead = Boolean(notification.is_read ?? notification.isRead) || localReadSet.has(id)
      return {
        id,
        userId: notification.student_id || notification.userId || userId,
        title: notification.title || "Notifikasi",
        message: notification.message || "",
        targetUrl: notification.target_url || notification.targetUrl,
        isRead,
      }
    })
  } catch {
    return []
  }
}

export async function markNotificationsAsRead(userId: string, notificationId?: string): Promise<void> {
  saveLocalReadId(userId, notificationId)

  try {
    await apiFetch(`/users/${userId}/notifications/read`, {
      method: "PATCH",
      body: JSON.stringify({ notificationId }),
    })
  } catch {
    // Ignore API error gracefully
  }
}
