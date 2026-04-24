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

  experiments: ExperimentSubmission[]
  exercises: ExerciseSubmission[]

  conclusion?: {
    content: JSONContent
    wordCount: number
  } | null

  review?: {
    comments: {
      experimentId?: string
      step?: number
      comment: string
    }[]
  }

  updatedAt: string
}