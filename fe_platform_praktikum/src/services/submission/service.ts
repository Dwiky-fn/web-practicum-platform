import { apiFetch } from "../api"

export const getSubmissionByJobsheetId = async (jobsheetId: string) => {
  const res = await apiFetch(`/submissions/${jobsheetId}`)

  return res.data.submission
}