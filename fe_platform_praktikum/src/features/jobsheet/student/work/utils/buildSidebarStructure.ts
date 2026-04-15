import type { Jobsheet } from "../../../../../entities/jobsheet/types"

export interface SidebarNode {
  id: string
  title: string
  path?: string
  children?: SidebarNode[]
  status?: "completed" | "active" | "pending"
}

export function buildSidebarTree(
  courseId: string,
  jobsheet: Jobsheet
): SidebarNode[] {

  const base = `/courses/${courseId}/jobsheets/${jobsheet.id}/works`

  return [
    {
      id: "theory",
      title: "Dasar Teori",
      children: jobsheet.theory.map(t => ({
        id: t.id,
        title: t.title,
        path: `${base}/theory/${t.id}`
      }))
    },
    {
      id: "experiment",
      title: "Percobaan",
      children: jobsheet.experiments.map(e => ({
        id: e.id,
        title: e.title,
        path: `${base}/experiments/${e.id}`
      }))
    },
    {
      id: "exercise",
      title: "Latihan",
      children: jobsheet.exercises.map(e => ({
        id: e.id,
        title: e.title,
        path: `${base}/exercises/${e.id}`
      }))
    },
    {
      id: "task",
      title: "Tugas",
      children: [
        {
          id: "task",
          title: "Laporan Praktikum",
          path: `${base}/task`,
          status:
            jobsheet.status === "ACCEPTED"
              ? "completed"
              : "pending"
        }
      ]
    }
  ]
}