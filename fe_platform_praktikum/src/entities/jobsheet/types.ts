import type { JSONContent } from "@tiptap/react";

// Status
export type JobsheetStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "REVIEWING"
  | "REVISION"
  | "ACCEPTED"
  | "OVERDUE"
  | "UNPUBLISHED";

// History
export interface SubmissionHistory {
  id: string;
  submittedAt: string;
  status: "SUBMITTED" | "REVISION" | "ACCEPTED";
  score?: number;
  note?: string;
}

// Theory
export interface TheoryTable {
  headers: string[];
  rows: string[][];
}

export interface TheorySection {
  id: string;
  subtitle: string;
  paragraphs?: string[];
  table?: TheoryTable;
}

export interface TheoryItem {
  id: string;
  order: number;
  title: string;
  content: JSONContent;
}

// Experiment
export interface Experiment {
  id: string;
  order: number;
  title: string;

  instructionContent?: JSONContent;
  defaultTemplateCode: string;
}

// Exercise
export interface Exercise {
  id: string;
  order: number;
  title: string;
  instructionContent: JSONContent;
  defaultTemplateCode?: string;
}

// Task Config
export interface TaskConfig {
  experimentIds: string[];
  exerciseIds: string[];

  instructionContent: JSONContent;
  additionalNoteContent?: JSONContent;

  requireSelfDeclaration: boolean;

  conclusionConfig?: {
    enabled: boolean;
    required: boolean;
    minWord?: number;
  };
}

// Activity Domain
export interface ExperimentStepAttempt {
  stepNumber: number;

  code: string;
  output: string;

  analysis?: JSONContent;
}

export interface ExperimentAttempt {
  experimentId: string;
  studentId: string;

  steps: ExperimentStepAttempt[];

  lastUpdatedAt: string;
}

export interface ExerciseAttempt {
  exerciseId: string;
  studentId: string;

  code: string;
  output: string;

  analysis?: JSONContent;

  lastUpdatedAt: string;
}

// Task Submission
export interface TaskSubmission {
  id: string;
  taskId: string;
  studentId: string;

  status: JobsheetStatus;

  conclusion?: {
    content: JSONContent;
    wordCount: number;
  };

  selfDeclarationAccepted: boolean;

  generatedReportHtml?: string;

  submittedAt?: string;
  updatedAt: string;
}

// Jobsheet
export interface Jobsheet {
  id: string;
  courseId: string;

  title: string;
  description: string;
  summary: JSONContent;

  goal: string;

  deadline: string;
  status: JobsheetStatus;
  score?: number;

  theory: TheoryItem[];
  experiments: Experiment[];
  exercises: Exercise[];

  task: TaskConfig;
}