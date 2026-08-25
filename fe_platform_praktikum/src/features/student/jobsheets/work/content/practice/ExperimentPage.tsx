import { useLocation, useParams } from "react-router-dom"
import { useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import NotFoundPage from "../../../../../not-found/NotFoundPage"
import RichTextViewer from "../../../../../../components/editor/RichTextViewer"
import { splitInstructionContent } from "../../../../../../shared/utils/splitInstructionContent"
import ProtectedContentContainer from "../../../../../../shared/components/ProtectedContentContainer"
import type { connectLiveWorkspaceSocket } from "../../../../../../services/liveWorkspaceSocket"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export default function ExperimentPage() {
  const { experimentId } = useParams()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const { jobsheet, programmingLanguage, updateExperiment, submission, trackActivity, liveWorkspace, readOnly } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExperiment: (experimentId: string, steps: StepData[]) => Promise<void>
    submission: JobsheetSubmission
    trackActivity?: (activityType: string, opts?: { experimentId?: string | null; instructionId?: string | null; metadata?: Record<string, any> }) => Promise<void>
    liveWorkspace?: ReturnType<typeof connectLiveWorkspaceSocket> | null
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
  const kelasPraktikumId = jobsheet.kelasPraktikumId || searchParams.get("kelasPraktikumId") || ""

  return (
    <div className="space-y-4">
      <ProtectedContentContainer>
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <span>{experiment.title}</span>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
            Bobot: {experiment.rubric ?? 0}%
          </span>
        </h2>
        {experiment.instructionContent && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <RichTextViewer content={experiment.instructionContent} mode="viewer-default" isProtected />
          </div>
        )}
      </ProtectedContentContainer>

      <InstructionWorkspaceCard
        key={componentKey}
        instructions={workspaceInstructions}
        templateCode={experiment.defaultTemplateCode}
        language={programmingLanguage}
        initialSteps={initialSteps}
        onChange={(steps) => updateExperiment(experimentId, steps)}
        onSave={() => trackActivity?.("save_code", { experimentId })}
        liveWorkspace={liveWorkspace}
        liveSection={{ type: "experiment", id: experimentId, name: experiment.title }}
        readOnly={readOnly}
        runContext={kelasPraktikumId ? {
          jobsheetId: jobsheet.id,
          kelasPraktikumId,
          attemptType: jobsheet.access?.attemptType ?? "normal",
          remedialId: jobsheet.access?.remedialId ?? null,
          moduleType: "experiment",
          experimentId,
          instructionIds: workspaceInstructions.map((_, index) => `${experiment.id}:step:${index + 1}`),
        } : undefined}
      />
    </div>
  )
}
