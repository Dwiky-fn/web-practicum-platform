import type { Jobsheet } from "../../../../../entities/jobsheet/types"

export interface WorkNavItem {
  id: string
  label: string
  path: string
}

export function buildWorkNavigation(
  courseId: string,
  jobsheet: Jobsheet
): WorkNavItem[] {
  const base = `/courses/${courseId}/jobsheets/${jobsheet.id}/works`
  const items: WorkNavItem[] = []

  // Teori
  jobsheet.theory.forEach((t) => {
    items.push({
      id: t.id,
      label: t.title,
      path: `${base}/theory/${t.id}`
    })
  })

  // Percobaan
  jobsheet.experiments.forEach((experiment) => {
    items.push({
      id: experiment.id,
      label: experiment.title,
      path: `${base}/experiments/${experiment.id}`
    })
  })

  // Latihan
  jobsheet.exercises.forEach((exercise) => {
    items.push({
      id: exercise.id,
      label: exercise.title,
      path: `${base}/exercises/${exercise.id}`
    })
  })

  // Tugas
  items.push({
    id: "task",
    label: "Laporan Praktikum",
    path: `${base}/task`
  })

  return items
}