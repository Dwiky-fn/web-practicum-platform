/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Jobsheet } from "../../entities/jobsheet/types"

export const mapJobsheet = (data: any): Jobsheet => ({
  ...data,

  experiments: data.experiments.map((exp: any) => ({
    ...exp,
    instructionContent: exp.instruction_content,
    defaultTemplateCode: exp.default_template_code,
  })),

  exercises: data.exercises.map((exe: any) => ({
    ...exe,
    instructionContent: exe.instruction_content,
    defaultTemplateCode: exe.default_template_code,
  })),

  theory: data.theory.map((t: any) => ({
    ...t,
    content: t.content,
  })),
})