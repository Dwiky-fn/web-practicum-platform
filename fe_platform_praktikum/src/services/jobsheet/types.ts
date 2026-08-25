import type { JSONContent } from "@tiptap/react";

// ================= STATUS =================
export type JobsheetStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED"
  | "ACCEPTED";

// ================= THEORY =================
export interface TheoryItem {
  id: string;
  order: number;
  title: string;
  content: JSONContent;
  rubric?: number;
}

// ================= EXPERIMENT =================
export interface Experiment {
  id: string;
  order: number;
  title: string;
  isReported: boolean;
  instructionContent?: JSONContent;
  defaultTemplateCode: string;
  rubric?: number;
  inactiveDurationMinutes?: number | null;
}

// ================= EXERCISE =================
export interface Exercise {
  id: string;
  order: number;
  title: string;
  isReported: boolean;
  instructionContent: JSONContent;
  defaultTemplateCode?: string;
  rubric?: number;
  inactiveDurationMinutes?: number | null;
}

export interface ReportableItemConfig {
  id: string;
  isReported: boolean;
}

// ================= TASK =================
export interface TaskConfig {
  experimentIds: string[];
  exerciseIds: string[];
  experimentItems?: ReportableItemConfig[];
  exerciseItems?: ReportableItemConfig[];

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
  order?: number;
  instruction_content: JSONContent;
  template_code?: string;
  default_template_code?: string;
  rubric?: number;
  inactiveDurationMinutes?: number | null;
  inactive_duration_minutes?: number | null;
};

export type RawExercise = {
  id: string;
  title: string;
  order?: number;
  instruction_content: JSONContent;
  template_code?: string;
  default_template_code?: string;
  rubric?: number;
  inactiveDurationMinutes?: number | null;
  inactive_duration_minutes?: number | null;
};

export type RawTheory = {
  id: string;
  title: string;
  order: number;
  content: JSONContent;
  rubric?: number;
};

export type RawJobsheet = {
  id: string;
  course_id?: string;
  mata_kuliah_id?: string;
  id_mata_kuliah?: string;
  kelas_praktikum_id?: string;
  id_kelas_praktikum?: string;
  status: JobsheetStatus;
  programming_language?: string;
  programming_language_display_name?: string;
  programming_language_file_extension?: string;
  editor_mode?: string;

  title: string;
  description: string;
  summary?: JSONContent;
  material_summary?: JSONContent;
  ringkasan_materi?: JSONContent;
  overview?: JSONContent;
  goal?: string;
  deadline: string;
  normalDeadline?: string;
  effectiveDeadline?: string;

  task?: TaskConfig;

  experiments?: RawExperiment[];
  exercises?: RawExercise[];
  theory?: RawTheory[];
  access?: Jobsheet["access"];
  urutan?: number;
  sequence?: number;
};

// ================= FINAL FE MODEL =================
export interface Jobsheet {
  id: string;
  courseId: string;
  mataKuliahId?: string;
  kelasPraktikumId?: string;
  status: JobsheetStatus;
  programmingLanguage?: string;
  programmingLanguageDisplayName?: string;
  programmingLanguageFileExtension?: string;
  editorMode?: string;

  title: string;
  description: string;
  summary: JSONContent;
  goal: string;
  deadline: string;
  normalDeadline?: string;
  effectiveDeadline?: string;
  urutan?: number;
  sequence?: number;

  theory: TheoryItem[];
  experiments: Experiment[];
  exercises: Exercise[];

  task: TaskConfig;
  access?: {
    accessMode: "editable_normal" | "locked_deadline" | "locked_sequence" | "readonly_submitted" | "readonly_reviewed" | "editable_remedial" | "locked_remedial_not_started" | "locked_remedial_ended";
    canEdit: boolean;
    canSaveProgress?: boolean;
    canSubmit: boolean;
    message?: string;
    attemptType?: "normal" | "remedial";
    attemptNo?: number;
    attemptLabel?: string;
    remedialId?: string;
    remedialTitle?: string;
    remedialStartAt?: string;
    remedialEndAt?: string;
    remedialStatus?: "not_started" | "active" | "ended" | "cancelled";
    normalDeadline?: string;
    effectiveDeadline?: string;
  };
}
