import type { Jobsheet, RawJobsheet } from "./types";

export const mapJobsheet = (data: RawJobsheet): Jobsheet => ({
  id: data.id,
  courseId: data.course_id, // 🔥 penting (snake → camel)
  status: data.status,
  programmingLanguage: data.programming_language || "java",
  programmingLanguageDisplayName: data.programming_language_display_name,
  judge0LanguageId: data.judge0_language_id,
  programmingLanguageFileExtension: data.programming_language_file_extension,

  title: data.title,
  description: data.description,
  summary: data.summary,
  goal: data.goal,
  deadline: data.deadline,

  task: data.task,

  experiments: data.experiments.map((exp) => ({
    id: exp.id,
    title: exp.title,
    order: exp.order,
    instructionContent: exp.instruction_content,
    defaultTemplateCode: exp.default_template_code,
  })),

  exercises: data.exercises.map((exe) => ({
    id: exe.id,
    title: exe.title,
    order: exe.order,
    instructionContent: exe.instruction_content,
    defaultTemplateCode: exe.default_template_code,
  })),

  theory: data.theory.map((t) => ({
    id: t.id,
    title: t.title,
    order: t.order,
    content: t.content,
  })),
});
