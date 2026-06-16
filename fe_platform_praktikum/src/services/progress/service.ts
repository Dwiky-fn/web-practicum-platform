import { apiFetch } from "../api"
import type { StudentProgress, UpsertStudentProgressPayload } from "./types"

export const getStudentProgress = async (
  jobsheetId: string,
  studentId: string,
  kelasPraktikumId?: string,
): Promise<StudentProgress | null> => {
  const params = new URLSearchParams({ studentId })
  if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
  const res = await apiFetch(
    `/student-progress/${jobsheetId}?${params.toString()}`,
  )

  return res.data.progress ?? null
}

export const upsertStudentProgress = async (
  jobsheetId: string,
  payload: UpsertStudentProgressPayload,
): Promise<StudentProgress> => {
  const res = await apiFetch(`/student-progress/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return res.data.progress
}

export interface UpdateStudentProgressPayload {
  studentId: string
  classId?: string
  kelasPraktikumId?: string
  experimentId?: string | null
  instructionId?: string | null
  activityType: string
  metadata?: Record<string, unknown>
}

export const updateStudentProgressApi = async (
  jobsheetId: string,
  payload: UpdateStudentProgressPayload,
): Promise<StudentProgress> => {
  const res = await apiFetch(`/student-progress/${jobsheetId}/update`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return res.data.progress
}
