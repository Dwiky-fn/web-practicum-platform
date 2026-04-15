import type { JSONContent } from "@tiptap/react";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEWING"
  | "REVISION"
  | "ACCEPTED";


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

export interface JobsheetSubmission {
  id: string;
  jobsheetId: string;

  experiments: ExperimentSubmission[];
  exercises: ExerciseSubmission[];

  conclusion?: {
    content: JSONContent;
    wordCount: number;
  };

  status: SubmissionStatus;

  createdAt: string;
  updatedAt: string;
}