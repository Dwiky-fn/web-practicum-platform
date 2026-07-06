export type StudentProgressStatus = "BELUM" | "SEDANG" | "SELESAI"
export type StudentProgressItemType = "theory" | "experiment" | "exercise" | "task"

export interface StudentProgressItem {
  type: StudentProgressItemType
  id: string
  completedAt: string
}

export interface ScoreBreakdownItem {
  type: "theory" | "experiment" | "exercise"
  itemId: string
  title: string
  weight: number
  completionRatio: number
  earnedScore: number
  completedSteps?: number
  totalSteps?: number
}

export interface ScoreBreakdown {
  progressScore: number
  totalWeight: number
  completedWeight: number
  calculatedAt?: string | null
  items: ScoreBreakdownItem[]
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
  calculated_progress_score?: number
  score_breakdown?: ScoreBreakdown
}

export interface UpsertStudentProgressPayload {
  studentId: string
  classId?: string
  kelasPraktikumId?: string
  progress: number
  lastPage?: string
  status: StudentProgressStatus
  completedItems?: StudentProgressItem[]
  attemptType?: "normal" | "remedial" | null
  remedialId?: string | null
}
