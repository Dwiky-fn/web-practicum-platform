import { useParams } from "react-router-dom"
import { useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../entities/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"
import type { JobsheetSubmission } from "../../../../../../entities/jobsheetSubmission/types"
import NotFoundPage from "../../../../../not-found/NotFoundPage"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

function splitInstructionContent(doc?: JSONContent): JSONContent[] {
  if (!doc?.content) return []

  const orderedList = doc.content.find(
    (node) => node.type === "orderedList"
  )

  // ✅ kalau tidak ada orderedList → pakai full doc
  if (!orderedList?.content) {
    return [doc]
  }

  return orderedList.content.map((listItem) => ({
    type: "doc",
    content: [
      {
        type: "orderedList",
        content: [listItem],
      },
    ],
  }))
}

export default function ExperimentPage() {
  const { experimentId } = useParams()
  const { jobsheet, programmingLanguage, updateExperiment, submission } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExperiment: (experimentId: string, steps: StepData[]) => void
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
          onChange={(steps) => {
            updateExperiment(experimentId, steps)
          }}
        />
      </div> 
    </div>
  )
}