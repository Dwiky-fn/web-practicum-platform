import type { Notification } from "./types"

const mockNotifications: Notification[] = [
  {
    id: "1",
    userId: "1",
    title: "Tugas Baru",
    message: "Tugas Pemrograman Web telah ditambahkan.",
    isRead: false,
  },
  {
    id: "2",
    userId: "1",
    title: "Nilai Keluar",
    message: "Nilai Basis Data sudah tersedia.",
    isRead: false,
  },
]

export async function getNotifications(userId: string): Promise<Notification[]> {
  return mockNotifications.filter((notification) => notification.userId === userId)
}
