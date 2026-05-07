import { apiFetch } from "../api"
import { mapJobsheet } from "./mapper"
import type { Jobsheet } from "./types"

export const getJobsheets = async (courseId: string): Promise<Jobsheet[]> => {
  const res = await apiFetch(`/courses/${courseId}/jobsheets`)
  return res.data.jobsheets.map(mapJobsheet)
}

export const getJobsheetById = async (courseId: string, jobsheetId: string) => {
  const res = await apiFetch(`/courses/${courseId}/jobsheets/${jobsheetId}/full`)
  return mapJobsheet(res.data.jobsheet)
}
