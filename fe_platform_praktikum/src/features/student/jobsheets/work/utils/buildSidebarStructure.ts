import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { StudentProgressItemType } from "../../../../../services/progress/types"
import type { JobsheetSubmission } from "../../../../../services/submission/types"

export interface SidebarNode {
  id: string
  title: string
  type?: StudentProgressItemType
  path?: string
  children?: SidebarNode[]
  status?: "completed" | "active" | "pending"
}

export function buildSidebarTree(
  courseId: string,
  jobsheet: Jobsheet,
  submission: JobsheetSubmission,
  query = "",
): SidebarNode[] {

  const base = `/courses/${courseId}/jobsheets/${jobsheet.id}/works`

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
          title: "Laporan Praktikum",
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
