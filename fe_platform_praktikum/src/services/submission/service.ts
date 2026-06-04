import { apiFetch } from "../api"
import { mapSubmission } from "./mapper"
import type { JobsheetSubmission } from "./types"

export const getSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
): Promise<JobsheetSubmission | null> => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}?studentId=${encodeURIComponent(studentId)}`
  )

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const getMappedSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
): Promise<JobsheetSubmission | null> => {
  return getSubmissionByJobsheetId(courseId, jobsheetId, studentId)
}

export const getOrCreateSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
): Promise<JobsheetSubmission | null> => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}/ensure?studentId=${encodeURIComponent(studentId)}`
  )

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const getSubmissionByJobsheetIdPreview = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
) => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}?studentId=${encodeURIComponent(studentId)}`
  )
  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const updateSubmission = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  report: unknown,
  status?: string,
) => {
  const res = await apiFetch(`/courses/${courseId}/submissions/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify({ studentId, report, status })
  })

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const submitSubmission = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
) => {
  return apiFetch(`/courses/${courseId}/submissions/${jobsheetId}/submit`, {
    method: "PATCH",
    body: JSON.stringify({ studentId }),
  })
}
