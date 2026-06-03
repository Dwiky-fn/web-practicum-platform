import { apiFetch } from "../api"
import type { StudentProgress, UpsertStudentProgressPayload } from "./types"

export const getStudentProgress = async (
  jobsheetId: string,
): Promise<StudentProgress | null> => {
  const res = await apiFetch(`/student-progress/${jobsheetId}`)

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
