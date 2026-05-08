export type ActivityType =
  | "TASK_SUBMITTED"
  | "GRADE_RELEASED"
  | "TASK_CREATED"
  | "ANNOUNCEMENT"

export interface Activity {
  id: string
  userId: string
  type: ActivityType
  title: string
  description: string
  createdAt: string
}
