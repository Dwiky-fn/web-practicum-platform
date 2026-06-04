export type StudentProgressStatus = "BELUM" | "SEDANG" | "SELESAI"
export type StudentProgressItemType = "theory" | "experiment" | "exercise" | "task"

export interface StudentProgressItem {
  type: StudentProgressItemType
  id: string
  completedAt: string
}

export interface StudentProgress {
  id: string
  student_id: string
  jobsheet_id: string
  class_id: string
  status: StudentProgressStatus
  progress: number
  last_page?: string | null
  last_activity?: string
  completed_items?: StudentProgressItem[]
}

export interface UpsertStudentProgressPayload {
  studentId: string
  progress: number
  lastPage?: string
  status: StudentProgressStatus
  completedItems?: StudentProgressItem[]
}
