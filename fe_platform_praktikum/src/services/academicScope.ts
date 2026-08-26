import type { Course } from "./course/types"

export type AcademicScope = {
  courseId?: string
  classId?: string
  mataKuliahId?: string
  kelasPraktikumId?: string
  submissionId?: string
  attemptNo?: number
  attemptType?: "normal" | "remedial"
  remedialId?: string | null
}

export function academicCourseBasePath(courseId?: string, scope?: AcademicScope) {
  if (scope?.mataKuliahId) return `/mata-kuliah/${scope.mataKuliahId}`
  return courseId ? `/mata-kuliah/${courseId}` : "/mata-kuliah"
}

export function academicJobsheetPath(courseId: string, jobsheetId: string, scope?: AcademicScope) {
  return `${academicCourseBasePath(courseId, scope)}/jobsheets/${jobsheetId}${academicScopeQuery(scope ?? {})}`
}

export function academicJobsheetSubPath(
  courseId: string,
  jobsheetId: string,
  segment: string,
  scope?: AcademicScope,
) {
  return `${academicCourseBasePath(courseId, scope)}/jobsheets/${jobsheetId}/${segment}${academicScopeQuery(scope ?? {})}`
}

export function academicJobsheetWorkPath(courseId: string, jobsheetId: string, scope?: AcademicScope) {
  return academicJobsheetSubPath(courseId, jobsheetId, "works", scope)
}

export function getCourseAcademicScope(course: Course): AcademicScope {
  return {
    courseId: course.id,
    classId: course.classId || course.class_id,
    mataKuliahId: course.mataKuliahId || course.id_mata_kuliah,
    kelasPraktikumId: course.kelasPraktikumId || course.id_kelas_praktikum,
  }
}

export function academicScopeQuery(scope: AcademicScope) {
  const params = new URLSearchParams()
  // classId is a compatibility alias for kelasPraktikumId.
  const kelasPraktikumId = scope.kelasPraktikumId ?? scope.classId
  if (scope.mataKuliahId) params.set("mataKuliahId", scope.mataKuliahId)
  if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
  if (scope.submissionId) params.set("submissionId", scope.submissionId)
  if (scope.remedialId) params.set("remedialId", scope.remedialId)
  if (scope.attemptType) params.set("attemptType", scope.attemptType)
  if (scope.attemptNo != null) params.set("attemptNo", String(scope.attemptNo))
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function academicCoursePath(course: Course) {
  const scope = getCourseAcademicScope(course)
  return `${academicCourseBasePath(course.id, scope)}${academicScopeQuery(scope)}`
}
