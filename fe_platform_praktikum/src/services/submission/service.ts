// jobsheetSubmission/service.ts
import { apiFetch } from "../api"

export const getSubmissionByJobsheetId = async (jobsheetId: string) => {
  const res = await apiFetch(`/submissions/${jobsheetId}`)

  return res.data.submission
}

export const updateSubmission = async (
  jobsheetId: string,
  report: unknown,
  status: string = "DRAFT"
) => {
  console.log("🔥 SERVICE UPDATE FILE TERPAKAI")
  return apiFetch(`/submissions/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify({ report, status })
  })
}