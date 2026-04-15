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

export interface JobsheetSubmission {
  id: string;
  jobsheetId: string;
  studentId: string;
  status: SubmissionStatus;
  score?: number;

  experiments: ExperimentSubmission[];
  exercises: ExerciseSubmission[];

  conclusion?: {
    content: JSONContent;
    wordCount: number;
  };

  createdAt: string;
  updatedAt: string;

  history?: SubmissionHistory[];
}