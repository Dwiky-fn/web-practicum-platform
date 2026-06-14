import { apiFetch } from "../api"
import { mapJobsheet } from "./mapper"
import type { Jobsheet } from "./types"

const classQuery = (classId?: string) => classId ? `?classId=${encodeURIComponent(classId)}` : ""

export const getJobsheets = async (courseId: string, classId?: string): Promise<Jobsheet[]> => {
  const res = await apiFetch(`/courses/${courseId}/jobsheets${classQuery(classId)}`)
  return res.data.jobsheets.map(mapJobsheet)
}

export const getJobsheetById = async (courseId: string, jobsheetId: string, classId?: string) => {
  const res = await apiFetch(`/courses/${courseId}/jobsheets/${jobsheetId}/full${classQuery(classId)}`)
  return mapJobsheet(res.data.jobsheet)
}
