import type { JobsheetSubmission } from "./types"
import type { JSONContent } from "@tiptap/core"

/* ================= RAW TYPES ================= */

type RawStep = {
  files?: Record<string, string>
  output?: string
  analysis?: JSONContent
}

type RawExperiment = {
  steps?: RawStep[]
}

type RawExercise = {
  files?: Record<string, string>
  output?: string
  analysis?: JSONContent
}

type RawReport = {
  experiments?: Record<string, RawExperiment>
  exercises?: Record<string, RawExercise>
  conclusion?: {
    content: JSONContent
    wordCount: number
  } | null
}

type RawSubmission = {
  id: string
  jobsheet_id: string
  student_id: string
  status: string
  updated_at: string
  report?: RawReport
}

/* ================= HELPER ================= */

function extractCode(files?: Record<string, string>) {
  if (!files) return ""

  return Object.entries(files)
    .map(([name, content]) => `// ${name}\n${content}`)
    .join("\n\n")
}

/* ================= MAPPER ================= */

export function mapSubmission(data: RawSubmission): JobsheetSubmission {
  const experimentsObj = data.report?.experiments ?? {}
  const exercisesObj = data.report?.exercises ?? {}

  return {
    id: data.id,
    jobsheetId: data.jobsheet_id,
    studentId: data.student_id,
    status: mapStatus(data.status),
    updatedAt: data.updated_at,

    experiments: Object.entries(experimentsObj).map(
      ([experimentId, value]) => ({
        experimentId,
        steps: (value.steps ?? []).map((step, index) => ({
          step: index + 1,
          code: extractCode(step.files),
          output: step.output ?? "",
          analysis: step.analysis ?? { type: "doc", content: [] }
        }))
      })
    ),

    exercises: Object.entries(exercisesObj).map(
      ([exerciseId, value]) => ({
        exerciseId,
        code: extractCode(value.files),
        output: value.output ?? "",
        analysis: value.analysis ?? { type: "doc", content: [] }
      })
    ),

    conclusion: data.report?.conclusion ?? null
  }
}

function mapStatus(status: string): JobsheetSubmission["status"] {
  const validStatuses: JobsheetSubmission["status"][] = [
    "DRAFT",
    "SUBMITTED",
    "REVIEWING",
    "REVISION",
    "ACCEPTED",
    "OVERDUE",
  ]

  if (validStatuses.includes(status as JobsheetSubmission["status"])) {
    return status as JobsheetSubmission["status"]
  }

  console.warn("⚠️ Unknown status from BE:", status)
  return "DRAFT"
}