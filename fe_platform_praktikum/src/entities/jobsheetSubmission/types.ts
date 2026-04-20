import type { JSONContent } from "@tiptap/react";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEWING"
  | "REVISION"
  | "ACCEPTED"
  | "OVERDUE";

export interface SubmissionStep {
  step: number;
  code: JSONContent;
  output: string;
  analysis: JSONContent;
}

export interface ExperimentSubmission {
  experimentId: string;
  steps: SubmissionStep[];
}

export interface ExerciseSubmission {
  exerciseId: string;
  code: JSONContent;
  output: string;
  analysis: JSONContent;
}

export interface SubmissionHistory {
  id: string;
  submittedAt: string;
}

export interface ReviewComment {
  experimentId?: string
  exerciseId?: string
  step?: number
  comment: string
}

export interface AISummary {
  totalPercobaan: number
  percobaanValid: number
  nilaiAkhir: number
}

export interface AIDetailItem {
  percobaan: string

  hasil: {
    kebenaran: number
    kualitasKode: number
    kualitasAnalisis: number
    total: number
    feedback: string
  }
}

export interface AIFeedback {
  summary: AISummary
  detail: AIDetailItem[]
}

export interface SubmissionReview {
  id: string
  submissionId: string
  lecturerId: string

  aiScore: number
  finalScore: number
  plagiarismScore: number

  aiFeedback: AIFeedback

  lecturerFeedback: string

  decision: "ACCEPTED" | "REVISION"

  comments?: ReviewComment[]
}

export type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export type ReportData = {
  experiments?: Record<string, {
    steps: StepData[]
  }>
  exercises?: Record<string, {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }>
  conclusion?: {
    content: JSONContent
    wordCount: number
  }
}

export interface JobsheetSubmission {
  id: string;
  jobsheetId: string;
  studentId: string;
  status: SubmissionStatus;
  score?: number;

  report: ReportData;

  review?: SubmissionReview;

  createdAt: string;
  updatedAt: string;

  history?: SubmissionHistory[];
}