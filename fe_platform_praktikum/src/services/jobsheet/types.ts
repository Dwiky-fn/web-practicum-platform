import type { JSONContent } from "@tiptap/react";

// ================= STATUS =================
export type JobsheetStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

// ================= THEORY =================
export interface TheoryItem {
  id: string;
  order: number;
  title: string;
  content: JSONContent;
}

// ================= EXPERIMENT =================
export interface Experiment {
  id: string;
  order: number;
  title: string;
  instructionContent?: JSONContent;
  defaultTemplateCode: string;
}

// ================= EXERCISE =================
export interface Exercise {
  id: string;
  order: number;
  title: string;
  instructionContent: JSONContent;
  defaultTemplateCode?: string;
}

// ================= TASK =================
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

// ================= RAW TYPES (FROM BE) =================
export type RawExperiment = {
  id: string;
  title: string;
  order: number;
  instruction_content: JSONContent;
  default_template_code: string;
};

export type RawExercise = {
  id: string;
  title: string;
  order: number;
  instruction_content: JSONContent;
  default_template_code: string;
};

export type RawTheory = {
  id: string;
  title: string;
  order: number;
  content: JSONContent;
};

export type RawJobsheet = {
  id: string;
  course_id: string;
  status: JobsheetStatus;
  programming_language?: string;
  programming_language_display_name?: string;
  judge0_language_id?: number;
  programming_language_file_extension?: string;

  title: string;
  description: string;
  summary: JSONContent;
  goal: string;
  deadline: string;

  task: TaskConfig;

  experiments: RawExperiment[];
  exercises: RawExercise[];
  theory: RawTheory[];
};

// ================= FINAL FE MODEL =================
export interface Jobsheet {
  id: string;
  courseId: string;
  status: JobsheetStatus;
  programmingLanguage?: string;
  programmingLanguageDisplayName?: string;
  judge0LanguageId?: number;
  programmingLanguageFileExtension?: string;

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
