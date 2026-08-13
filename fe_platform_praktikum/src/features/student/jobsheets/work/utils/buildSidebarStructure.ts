import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { StudentProgressItemType } from "../../../../../services/progress/types"
import type { JobsheetSubmission } from "../../../../../services/submission/types"
import { academicCourseBasePath, type AcademicScope } from "../../../../../services/academicScope"

export interface SidebarNode {
  id: string
  title: string
  type?: StudentProgressItemType
  path?: string
  children?: SidebarNode[]
  status?: "completed" | "active" | "pending"
  meta?: {
    isLastPosition?: boolean
    positionLabel?: string
  }
}

export function buildSidebarTree(
  courseId: string,
  jobsheet: Jobsheet,
  submission: JobsheetSubmission,
  query = "",
  scope?: AcademicScope,
  basePathOverride?: string,
): SidebarNode[] {

  const base = basePathOverride ?? `${academicCourseBasePath(courseId, scope)}/jobsheets/${jobsheet.id}/works`

  return [
    {
      id: "theory",
      title: "Dasar Teori",
      children: jobsheet.theory.map(t => ({
        id: t.id,
        title: t.title,
        type: "theory",
        path: `${base}/theory/${t.id}${query}`
      }))
    },
    {
      id: "experiment",
      title: "Percobaan",
      children: jobsheet.experiments.map(e => ({
        id: e.id,
        title: `${e.title} (${e.rubric ?? 0}%)`,
        type: "experiment",
        path: `${base}/experiments/${e.id}${query}`
      }))
    },
    {
      id: "exercise",
      title: "Latihan",
      children: jobsheet.exercises.map(e => ({
        id: e.id,
        title: `${e.title} (${e.rubric ?? 0}%)`,
        type: "exercise",
        path: `${base}/exercises/${e.id}${query}`
      }))
    },
    {
      id: "task",
      title: "Tugas",
      children: [
        {
          id: "task",
          title: "Tugas",
          type: "task",
          path: `${base}/task${query}`,
          status:
            submission?.status === "SUBMITTED" ||
            submission?.status === "REVIEWING" ||
            submission?.status === "ACCEPTED"
              ? "completed"
              : "pending"
        }
      ]
    }
  ]
}
