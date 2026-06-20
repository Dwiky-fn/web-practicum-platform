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
  // classId is a compatibility alias for kelasPraktikumId.
  const kelasPraktikumId = scope?.kelasPraktikumId ?? scope?.classId
  if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
  return params.toString() ? `?${params.toString()}` : ""
}

const resolveScope = (classIdOrScope?: string | JobsheetScope): JobsheetScope => {
  if (!classIdOrScope) return {}
  // String argument is the old classId shape and represents kelasPraktikumId.
  if (typeof classIdOrScope === "string") return { classId: classIdOrScope }
  return classIdOrScope
}

const jobsheetBasePath = (courseId: string, scope?: JobsheetScope) => {
  if (scope?.mataKuliahId) return `/mata-kuliah/${scope.mataKuliahId}/jobsheets`
  return `/mata-kuliah/${courseId}/jobsheets`
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
