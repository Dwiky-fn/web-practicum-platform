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
  const { jobsheet, programmingLanguage, updateExperiment, submission } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExperiment: (experimentId: string, steps: StepData[]) => Promise<void>
    submission: JobsheetSubmission
  }>()

  const experiment = jobsheet.experiments.find(exp => exp.id === experimentId)
  if (!experiment || !experimentId) {
    return <NotFoundPage />
  }

  // PERBAIKI: Ambil data dari submission dengan lebih hati-hati
  const initialSteps = submission?.report?.experiments?.[experiment.id]?.steps
  
  // TAMBAHKAN: Key yang lebih stabil
  const componentKey = `${experiment.id}-${submission?.updatedAt || 'initial'}`

  const instructions = splitInstructionContent(experiment.instructionContent)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {experiment.title}
      </h1>

      <div className="max-w-3xl">

        {experiment.instructionContent && (
          <RichTextViewer
            content={experiment.instructionContent}
            mode="viewer-default"
          />
        )}
        <InstructionWorkspaceCard
          key={componentKey}  // PERBAIKI: Gunakan key yang lebih stabil
          instructions={instructions}
          templateCode={experiment.defaultTemplateCode}
          language={programmingLanguage}
          initialSteps={initialSteps}
          onChange={(steps) => updateExperiment(experimentId, steps)}
        />
      </div> 
    </div>
  )
}
