import type { JSONContent } from "@tiptap/react";

// Status
export type JobsheetStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

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

// Jobsheet
export interface Jobsheet {
  id: string;
  courseId: string;
  status: string;

  title: string;
  description: string;
  summary: JSONContent;

  goal: string;

  deadline: string;

  theory: TheoryItem[];
  experiments: Experiment[];
  exercises: Exercise[];

  task: TaskConfig;
}