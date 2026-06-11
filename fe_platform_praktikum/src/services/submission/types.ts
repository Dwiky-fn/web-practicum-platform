import type { JSONContent } from "@tiptap/core"

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEWING"
  | "REVISION"
  | "ACCEPTED"
  | "OVERDUE"

export interface StepData {
  step: number
  code: string
  output: string
  analysis: JSONContent
}

export interface ExperimentSubmission {
  experimentId: string
  steps: StepData[]
}

export interface ExerciseSubmission {
  exerciseId: string
  code: string
  output: string
  analysis: JSONContent
}

export interface JobsheetSubmission {
  id: string
  jobsheetId: string
  studentId: string
  status: SubmissionStatus
  score?: number
  aiEvaluationStatus?: string
  aiEvaluationError?: string

  report: {
    experiments?: Record<string, {
        steps: {
        files: Record<string, string>
        output: string
        analysis: JSONContent
      }[]
    }>
    exercises?: Record<string, {
      files: Record<string, string>
      output: string
      analysis: JSONContent
    }>
    conclusion?: {
      content: JSONContent
      wordCount: number
    } | null
  }

  experiments: ExperimentSubmission[]
  exercises: ExerciseSubmission[]

  conclusion?: {
    content: JSONContent
    wordCount: number
  } | null

  review?: {
    finalScore?: number
    lecturerFeedback?: string
    decision?: "PENDING" | "ACCEPTED" | "REVISION"
    comments: {
      experimentId?: string
      exerciseId?: string
      step?: number
      comment: string
    }[]
    aiFeedback?: any
  }

  createdAt?: string
  updatedAt: string
}
