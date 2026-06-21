import { useParams } from "react-router-dom"
import { useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import NotFoundPage from "../../../../../not-found/NotFoundPage"
import RichTextViewer from "../../../../../../components/editor/RichTextViewer"
import { splitInstructionContent } from "../../../../../../shared/utils/splitInstructionContent"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export default function ExperimentPage() {
  const { experimentId } = useParams()
  const { jobsheet, programmingLanguage, updateExperiment, submission, trackActivity, readOnly } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExperiment: (experimentId: string, steps: StepData[]) => Promise<void>
    submission: JobsheetSubmission
    trackActivity?: (activityType: string, opts?: { experimentId?: string | null; instructionId?: string | null; metadata?: Record<string, any> }) => Promise<void>
    readOnly?: boolean
  }>()

  const experiment = jobsheet.experiments.find(exp => exp.id === experimentId)
  if (!experiment || !experimentId) {
    return <NotFoundPage />
  }

  // PERBAIKI: Ambil data dari submission dengan lebih hati-hati
  const initialSteps = submission?.report?.experiments?.[experiment.id]?.steps
  
  const componentKey = experiment.id
  const workspaceInstructions = splitInstructionContent(experiment.instructionContent)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <span>{`Percobaan ${experiment.order || jobsheet.experiments.findIndex(exp => exp.id === experiment.id) + 1}: ${experiment.title}`}</span>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
            Bobot: {experiment.rubric ?? 0}%
          </span>
        </h2>
        {experiment.instructionContent && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <RichTextViewer content={experiment.instructionContent} mode="viewer-default" />
          </div>
        )}
      </div>

      <InstructionWorkspaceCard
        key={componentKey}
        title={experiment.title}
        label={`Percobaan ${experiment.order || jobsheet.experiments.findIndex(exp => exp.id === experiment.id) + 1}`}
        instructions={workspaceInstructions}
        templateCode={experiment.defaultTemplateCode}
        language={programmingLanguage}
        initialSteps={initialSteps}
        onChange={(steps) => updateExperiment(experimentId, steps)}
        onRun={() => trackActivity?.("run_code", { experimentId })}
        onSave={() => trackActivity?.("save_code", { experimentId })}
        readOnly={readOnly}
      />
    </div>
  )
}
