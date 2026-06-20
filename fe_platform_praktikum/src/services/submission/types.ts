import type { JSONContent } from "@tiptap/core"
import type { ScoreBreakdown } from "../progress/types"

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
  attemptNo?: number
  attemptType?: "normal" | "remedial"
  attemptLabel?: string
  remedialId?: string | null
  parentSubmissionId?: string | null
  isAutoSubmitted?: boolean
  autoSubmittedAt?: string | null
  submissionSource?: "manual" | "auto_deadline" | "remedial"
  calculatedProgressScore?: number | null
  scoreBreakdown?: ScoreBreakdown | null
  aiEvaluationStatus?: string
  aiEvaluationError?: string
  aiEvaluationStartedAt?: string
  aiEvaluationFinishedAt?: string

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
