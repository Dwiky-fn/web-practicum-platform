// jobsheetSubmission/service.ts
import { apiFetch } from "../api"
import { mapSubmission } from "./mapper"

export const getSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string
) => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}`
  )

  return res.data.submission
}

export const getSubmissionByJobsheetIdPreview = async (
  courseId: string,
  jobsheetId: string
) => {
  const res = await apiFetch(
    `/courses/${courseId}/submissions/${jobsheetId}`
  )
  const mapped = mapSubmission(res.data.submission)
  return mapped
}

export const updateSubmission = async (
  courseId: string,
  jobsheetId: string,
  report: unknown,
) => {
  return apiFetch(`/courses/${courseId}/submissions/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify({ report, status })
  })
}

export const submitSubmission = async (
  courseId: string,
  jobsheetId: string,
) => {
  return apiFetch(`/courses/${courseId}/submissions/${jobsheetId}/submit`, {
    method: "PATCH",
  })
}