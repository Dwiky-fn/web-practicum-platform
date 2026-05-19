import type { JobsheetSubmission } from "./types";

export function buildReport(submission: JobsheetSubmission) {
  if (submission.report) return submission.report

  return {
    experiments: Object.fromEntries(
      submission.experiments.map((exp) => [
        exp.experimentId,
        {
          steps: exp.steps.map((step) => ({
            files: { "Main.java": step.code },
            output: step.output,
            analysis: step.analysis,
          })),
        },
      ])
    ),
    exercises: Object.fromEntries(
      submission.exercises.map((ex) => [
        ex.exerciseId,
        {
          files: { "Main.java": ex.code },
          output: ex.output,
          analysis: ex.analysis,
        },
      ])
    ),
    conclusion: submission.conclusion ?? null,
  }
}
