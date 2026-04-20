import { useParams } from "react-router-dom"
import { useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../entities/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"

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

  if (!orderedList?.content) return []

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
  const { jobsheet, programmingLanguage, updateExperiment } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExperiment: (experimentId: string, steps: StepData[]) => void
  }>()
  
  const experiment = jobsheet.experiments.find(
    exp => exp.id === experimentId
  )

  if (!experiment) {
    return <div>Experiment not found</div>
  }

  const instructions = splitInstructionContent(
    experiment.instructionContent
  )

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
          key={experiment.id}
          instructions={instructions}
          templateCode={experiment.defaultTemplateCode}
          language={programmingLanguage}
          onChange={(steps) => {
            updateExperiment(experiment.id, steps)
          }}
          />
      </div> 
    </div>
  )
}