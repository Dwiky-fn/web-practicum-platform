import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../services/submission/types"
import { splitInstructionContent } from "../../../../../shared/utils/splitInstructionContent"

function getTiptapText(node: any): string {
  if (!node) return ""
  if (node.type === "text") return node.text || ""
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(getTiptapText).join("")
  }
  return ""
}

export function getIncompletePracticeMessage(
  pathname: string,
  jobsheet: Jobsheet,
  submission: JobsheetSubmission
): string | null {
  const isExperiment = pathname.includes("/experiments/")
  const isExercise = pathname.includes("/exercises/")
  if (!isExperiment && !isExercise) return null

  const parts = pathname.split("?")[0].split("/")
  const targetId = isExperiment ? parts[parts.indexOf("experiments") + 1] : parts[parts.indexOf("exercises") + 1]
  if (!targetId) return null

  if (isExperiment) {
    const experiment = jobsheet.experiments.find(exp => exp.id === targetId)
    if (!experiment) return null
    
    const stepsConfig = splitInstructionContent(experiment.instructionContent)
    const codeIndices = stepsConfig.map((step, idx) => step.needsCode ? idx : -1).filter(idx => idx !== -1)
    
    if (codeIndices.length === 0) return null

    const report = submission?.report?.experiments?.[targetId]
    const stepsData = report?.steps ?? []

    const missingDetails: string[] = []

    for (const index of codeIndices) {
      const step = stepsData[index]
      const filesObj = (step?.files || {}) as Record<string, string>
      const hasCode = Object.values(filesObj).some(c => typeof c === "string" && Boolean(c.trim()))
      const hasOutput = typeof step?.output === "string" && Boolean(step.output.trim())
      
      let hasAnalysis = false
      if (step?.analysis) {
        if (typeof step.analysis === "string") {
          hasAnalysis = Boolean((step.analysis as any).trim())
        } else {
          hasAnalysis = getTiptapText(step.analysis).trim().length > 0
        }
      }

      const stepMissing: string[] = []
      if (!hasCode) stepMissing.push("kode program")
      if (!hasOutput) stepMissing.push("output (klik Run)")
      if (!hasAnalysis) stepMissing.push("analisis")

      if (stepMissing.length > 0) {
        missingDetails.push(`Instruksi ${index + 1} (${stepMissing.join(", ")})`)
      }
    }

    if (missingDetails.length > 0) {
      return `Belum terisi lengkap: ${missingDetails.join("; ")}`
    }
  }

  if (isExercise) {
    const exercise = jobsheet.exercises.find(exe => exe.id === targetId)
    if (!exercise) return null

    const step = submission?.report?.exercises?.[targetId]
    const filesObj = (step?.files || {}) as Record<string, string>
    const hasCode = Object.values(filesObj).some(c => typeof c === "string" && Boolean(c.trim()))
    const hasOutput = typeof step?.output === "string" && Boolean(step.output.trim())
    
    let hasAnalysis = false
    if (step?.analysis) {
      if (typeof step.analysis === "string") {
        hasAnalysis = Boolean((step.analysis as any).trim())
      } else {
        hasAnalysis = getTiptapText(step.analysis).trim().length > 0
      }
    }

    const stepMissing: string[] = []
    if (!hasCode) stepMissing.push("kode program")
    if (!hasOutput) stepMissing.push("output (klik Run)")
    if (!hasAnalysis) stepMissing.push("analisis")

    if (stepMissing.length > 0) {
      return `Belum terisi lengkap: Latihan (${stepMissing.join(", ")})`
    }
  }

  return null
}
