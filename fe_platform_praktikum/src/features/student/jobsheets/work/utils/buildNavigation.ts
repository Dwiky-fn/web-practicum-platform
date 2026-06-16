import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { StudentProgressItemType } from "../../../../../services/progress/types"
import { academicCourseBasePath, type AcademicScope } from "../../../../../services/academicScope"

export interface WorkNavItem {
  id: string
  label: string
  path: string
  type: StudentProgressItemType
}

export function buildWorkNavigation(
  courseId: string,
  jobsheet: Jobsheet,
  query = "",
  scope?: AcademicScope,
): WorkNavItem[] {
  const base = `${academicCourseBasePath(courseId, scope)}/jobsheets/${jobsheet.id}/works`
  const items: WorkNavItem[] = []

  // Teori
  jobsheet.theory.forEach((t) => {
    items.push({
      id: t.id,
      label: t.title,
      path: `${base}/theory/${t.id}${query}`,
      type: "theory",
    })
  })

  // Percobaan
  jobsheet.experiments.forEach((experiment) => {
    items.push({
      id: experiment.id,
      label: experiment.title,
      path: `${base}/experiments/${experiment.id}${query}`,
      type: "experiment",
    })
  })

  // Latihan
  jobsheet.exercises.forEach((exercise) => {
    items.push({
      id: exercise.id,
      label: exercise.title,
      path: `${base}/exercises/${exercise.id}${query}`,
      type: "exercise",
    })
  })

  // Tugas
  items.push({
    id: "task",
    label: "Laporan Praktikum",
    path: `${base}/task${query}`,
    type: "task",
  })

  return items
}
