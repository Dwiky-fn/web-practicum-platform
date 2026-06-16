import type { Course } from "./course/types"

export type AcademicScope = {
  courseId?: string
  classId?: string
  mataKuliahId?: string
  kelasPraktikumId?: string
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
  if (scope.classId) params.set("classId", scope.classId)
  if (scope.mataKuliahId) params.set("mataKuliahId", scope.mataKuliahId)
  if (scope.kelasPraktikumId) params.set("kelasPraktikumId", scope.kelasPraktikumId)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function academicCoursePath(course: Course) {
  const scope = getCourseAcademicScope(course)
  return `/courses/${course.id}${academicScopeQuery(scope)}`
}
