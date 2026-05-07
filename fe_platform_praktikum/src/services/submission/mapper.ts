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
  created_at?: string
  updated_at: string
  submitted_at?: string | null
  report?: RawReport
  report_html?: string | null
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
  const report = normalizeReport(data)
  const experimentsObj = report.experiments ?? {}
  const exercisesObj = report.exercises ?? {}
  const timestamp = data.updated_at ?? data.submitted_at ?? data.created_at ?? ""

  return {
    id: data.id,
    jobsheetId: data.jobsheet_id,
    studentId: data.student_id,
    status: mapStatus(data.status),
    report,
    createdAt: data.created_at,
    updatedAt: timestamp,

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

    conclusion: report.conclusion ?? null
  }
}

function normalizeReport(data: RawSubmission): JobsheetSubmission["report"] {
  const raw = parseRawReport(data)

  return {
    experiments: Object.fromEntries(
      Object.entries(raw.experiments ?? {}).map(([id, experiment]) => [
        id,
        {
          steps: (experiment.steps ?? []).map((step) => ({
            files: step.files ?? {},
            output: step.output ?? "",
            analysis: step.analysis ?? { type: "doc", content: [] },
          })),
        },
      ])
    ),
    exercises: Object.fromEntries(
      Object.entries(raw.exercises ?? {}).map(([id, exercise]) => [
        id,
        {
          files: exercise.files ?? {},
          output: exercise.output ?? "",
          analysis: exercise.analysis ?? { type: "doc", content: [] },
        },
      ])
    ),
    conclusion: raw.conclusion ?? null,
  }
}

function parseRawReport(data: RawSubmission): RawReport {
  if (data.report) return data.report
  if (!data.report_html) return {}

  try {
    return JSON.parse(data.report_html) as RawReport
  } catch {
    console.warn("Tidak bisa membaca report_html dari BE")
    return {}
  }
}

function mapStatus(status: string): JobsheetSubmission["status"] {
  if (status === "REVIEWED") return "ACCEPTED"

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
