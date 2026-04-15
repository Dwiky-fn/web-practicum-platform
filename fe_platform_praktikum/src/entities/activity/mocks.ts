import type { ActivityListResponse } from "./types";

export const mockActivityList: ActivityListResponse = {
  data: [
    {
      id: "1",
      userId: "1",
      type: "TASK_SUBMITTED",
      title: "Tugas Dikumpulkan",
      description: "Anda mengumpulkan tugas REST API.",
      createdAt: "2026-02-18",
    },
    {
      id: "2",
      userId: "1",
      type: "GRADE_RELEASED",
      title: "Nilai Telah Keluar",
      description: "Nilai Basis Data telah dipublikasikan.",
      createdAt: "2026-02-17",
    },
    {
      id: "3",
      userId: "2",
      type: "TASK_CREATED",
      title: "Tugas Baru Dibuat",
      description: "Anda membuat tugas Struktur Data.",
      createdAt: "2026-02-18",
    },
  ],
};
