import { apiFetch } from "../api"
import { mapJobsheet } from "./mapper"
import type { Jobsheet } from "./types"

export type JobsheetScope = {
  classId?: string
  kelasPraktikumId?: string
  mataKuliahId?: string
}

const buildQuery = (scope?: JobsheetScope) => {
  const params = new URLSearchParams()
  if (scope?.classId) params.set("classId", scope.classId)
  if (scope?.kelasPraktikumId) params.set("kelasPraktikumId", scope.kelasPraktikumId)
  return params.toString() ? `?${params.toString()}` : ""
}

const resolveScope = (classIdOrScope?: string | JobsheetScope): JobsheetScope => {
  if (!classIdOrScope) return {}
  if (typeof classIdOrScope === "string") return { classId: classIdOrScope }
  return classIdOrScope
}

const jobsheetBasePath = (courseId: string, scope?: JobsheetScope) => {
  if (scope?.mataKuliahId) return `/mata-kuliah/${scope.mataKuliahId}/jobsheets`
  return `/courses/${courseId}/jobsheets`
}

export const getJobsheets = async (
  courseId: string,
  classIdOrScope?: string | JobsheetScope,
): Promise<Jobsheet[]> => {
  const scope = resolveScope(classIdOrScope)
  const res = await apiFetch(`${jobsheetBasePath(courseId, scope)}${buildQuery(scope)}`)
  return res.data.jobsheets.map(mapJobsheet)
}

export const getJobsheetById = async (
  courseId: string,
  jobsheetId: string,
  classIdOrScope?: string | JobsheetScope,
) => {
  const scope = resolveScope(classIdOrScope)
  const basePath = jobsheetBasePath(courseId, scope)
  const res = await apiFetch(`${basePath}/${jobsheetId}/full${buildQuery(scope)}`)
  return mapJobsheet(res.data.jobsheet)
}
