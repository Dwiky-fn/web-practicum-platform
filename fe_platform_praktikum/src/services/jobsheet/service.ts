import { apiFetch } from "../api"

export const getJobsheetById = async (jobsheetId: string) => {
  const res = await apiFetch(`/jobsheets/${jobsheetId}/full`)
  return res.data.jobsheet
}