import type { Jobsheet, RawJobsheet, ReportableItemConfig, TaskConfig } from "./types";

const emptyDoc = { type: "doc" as const, content: [] };

function normalizeReportableItems(
  ids: string[] | undefined,
  items: ReportableItemConfig[] | undefined,
  allIds: string[],
) {
  if (items?.length) {
    const itemMap = new Map(items.map((item) => [item.id, Boolean(item.isReported)]))
    return allIds.map((id) => ({
      id,
      isReported: itemMap.get(id) ?? false,
    }))
  }

  const selectedIds = new Set(ids ?? allIds)
  return allIds.map((id) => ({
    id,
    isReported: selectedIds.has(id),
  }))
}

function normalizeTask(
  data: RawJobsheet,
  experimentIds: string[],
  exerciseIds: string[],
): TaskConfig {
  const rawTask = data.task
  const experimentItems = normalizeReportableItems(
    rawTask?.experimentIds,
    rawTask?.experimentItems,
    experimentIds,
  )
  const exerciseItems = normalizeReportableItems(
    rawTask?.exerciseIds,
    rawTask?.exerciseItems,
    exerciseIds,
  )

  return {
    experimentIds: experimentItems.filter((item) => item.isReported).map((item) => item.id),
    exerciseIds: exerciseItems.filter((item) => item.isReported).map((item) => item.id),
    experimentItems,
    exerciseItems,
    instructionContent: rawTask?.instructionContent || emptyDoc,
    additionalNoteContent: rawTask?.additionalNoteContent,
    requireSelfDeclaration: rawTask?.requireSelfDeclaration ?? false,
    conclusionConfig: rawTask?.conclusionConfig ?? {
      enabled: true,
      required: false,
    },
  }
}

export const mapJobsheet = (data: RawJobsheet): Jobsheet => {
  const experimentIds = (data.experiments || []).map((exp) => exp.id)
  const exerciseIds = (data.exercises || []).map((exe) => exe.id)
  const task = normalizeTask(data, experimentIds, exerciseIds)

  return {
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
    task,

    experiments: (data.experiments || []).map((exp, index) => ({
      id: exp.id,
      title: exp.title,
      order: exp.order ?? index + 1,
      isReported: task.experimentItems?.find((item) => item.id === exp.id)?.isReported ?? false,
      instructionContent: exp.instruction_content || emptyDoc,
      defaultTemplateCode: exp.default_template_code || exp.template_code || "",
      rubric: exp.rubric ?? 0,
    })),

    exercises: (data.exercises || []).map((exe, index) => ({
      id: exe.id,
      title: exe.title,
      order: exe.order ?? index + 1,
      isReported: task.exerciseItems?.find((item) => item.id === exe.id)?.isReported ?? false,
      instructionContent: exe.instruction_content || emptyDoc,
      defaultTemplateCode: exe.default_template_code || exe.template_code || "",
      rubric: exe.rubric ?? 0,
    })),

    theory: (data.theory || []).map((t, index) => ({
      id: t.id,
      title: t.title,
      order: t.order ?? index + 1,
      content: t.content || emptyDoc,
    })),
  }
}
