import { apiFetch } from "../api"
import { mapSubmission } from "./mapper"
import type { JobsheetSubmission } from "./types"

export type SubmissionScope = {
  mataKuliahId?: string
  kelasPraktikumId?: string
}

const buildSubmissionPath = (courseId: string, jobsheetId: string, scope?: SubmissionScope) => {
  const base = scope?.mataKuliahId
    ? `/mata-kuliah/${scope.mataKuliahId}/submissions`
    : `/mata-kuliah/${courseId}/submissions`

  return `${base}/${jobsheetId}`
}

const buildStudentQuery = (studentId: string, scope?: SubmissionScope) => {
  const params = new URLSearchParams({ studentId })
  if (scope?.kelasPraktikumId) params.set("kelasPraktikumId", scope.kelasPraktikumId)
  return params.toString()
}

export const getSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: SubmissionScope,
): Promise<JobsheetSubmission | null> => {
  const res = await apiFetch(
    `${buildSubmissionPath(courseId, jobsheetId, scope)}?${buildStudentQuery(studentId, scope)}`
  )

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const getMappedSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: SubmissionScope,
): Promise<JobsheetSubmission | null> => {
  return getSubmissionByJobsheetId(courseId, jobsheetId, studentId, scope)
}

export const getOrCreateSubmissionByJobsheetId = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: SubmissionScope,
): Promise<JobsheetSubmission | null> => {
  const res = await apiFetch(
    `${buildSubmissionPath(courseId, jobsheetId, scope)}/ensure?${buildStudentQuery(studentId, scope)}`
  )

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const getSubmissionByJobsheetIdPreview = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: SubmissionScope,
) => {
  const res = await apiFetch(
    `${buildSubmissionPath(courseId, jobsheetId, scope)}?${buildStudentQuery(studentId, scope)}`
  )
  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const updateSubmission = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  report: unknown,
  status?: string,
  scope?: SubmissionScope,
) => {
  const res = await apiFetch(buildSubmissionPath(courseId, jobsheetId, scope), {
    method: "PUT",
    body: JSON.stringify({ studentId, report, status, kelasPraktikumId: scope?.kelasPraktikumId })
  })

  return res.data.submission ? mapSubmission(res.data.submission) : null
}

export const submitSubmission = async (
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: SubmissionScope,
) => {
  return apiFetch(`${buildSubmissionPath(courseId, jobsheetId, scope)}/submit`, {
    method: "PATCH",
    body: JSON.stringify({ studentId, kelasPraktikumId: scope?.kelasPraktikumId }),
  })
}
