import type { NotificationListResponse } from "./types";

export const mockNotificationList: NotificationListResponse = {
  data: [
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
  ],
};
