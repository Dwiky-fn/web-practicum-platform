import type { Jobsheet, RawJobsheet } from "./types";

const emptyDoc = { type: "doc" as const, content: [] };

export const mapJobsheet = (data: RawJobsheet): Jobsheet => ({
  id: data.id,
  courseId: data.course_id,
  status: data.status,
  programmingLanguage: data.programming_language || "java",
  programmingLanguageDisplayName: data.programming_language_display_name || "Java",
  programmingLanguageFileExtension: data.programming_language_file_extension || "java",

  title: data.title,
  description: data.description || "",
  summary: data.summary || emptyDoc,
  goal: data.goal || "",
  deadline: data.deadline || "",

  task: data.task || {
    experimentIds: (data.experiments || []).map((exp) => exp.id),
    exerciseIds: (data.exercises || []).map((exe) => exe.id),
    instructionContent: emptyDoc,
    requireSelfDeclaration: false,
    conclusionConfig: {
      enabled: true,
      required: false,
    },
  },

  experiments: (data.experiments || []).map((exp, index) => ({
    id: exp.id,
    title: exp.title,
    order: exp.order ?? index + 1,
    instructionContent: exp.instruction_content || emptyDoc,
    defaultTemplateCode: exp.default_template_code || exp.template_code || "",
  })),

  exercises: (data.exercises || []).map((exe, index) => ({
    id: exe.id,
    title: exe.title,
    order: exe.order ?? index + 1,
    instructionContent: exe.instruction_content || emptyDoc,
    defaultTemplateCode: exe.default_template_code || exe.template_code || "",
  })),

  theory: (data.theory || []).map((t, index) => ({
    id: t.id,
    title: t.title,
    order: t.order ?? index + 1,
    content: t.content || emptyDoc,
  })),
});
