// jobsheetSubmission/service.ts
import { apiFetch } from "../api"
import { mapSubmission } from "./mapper"
import type { JobsheetSubmission } from "./types"

export const getSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string
): Promise<JobsheetSubmission | null> => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}`
  )

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const getMappedSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string
): Promise<JobsheetSubmission | null> => {
  return getSubmissionByJobsheetId(courseId, jobsheetId)
}

export const getSubmissionByJobsheetIdPreview = async (
  courseId: string,
  jobsheetId: string
) => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}`
  )
  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const updateSubmission = async (
  courseId: string,
  jobsheetId: string,
  report: unknown,
  status?: string,
) => {
  const res = await apiFetch(`/courses/${courseId}/submissions/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify({ report, status })
  })

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const submitSubmission = async (
  courseId: string,
  jobsheetId: string,
) => {
  return apiFetch(`/courses/${courseId}/submissions/${jobsheetId}/submit`, {
    method: "PATCH",
  })
}
