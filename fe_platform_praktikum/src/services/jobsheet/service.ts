import { apiFetch } from "../api"
import { mapJobsheet } from "./mapper"

export const getJobsheetById = async (courseId: string, jobsheetId: string) => {
  const res = await apiFetch(`/courses/${courseId}/jobsheets/${jobsheetId}/full`)
  return mapJobsheet(res.data.jobsheet)
}