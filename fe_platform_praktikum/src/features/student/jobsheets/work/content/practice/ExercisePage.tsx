import { useLocation, useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import NotFoundPage from "../../../../../not-found/NotFoundPage"
import RichTextViewer from "../../../../../../components/editor/RichTextViewer"
import type { connectLiveWorkspaceSocket } from "../../../../../../services/liveWorkspaceSocket"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export default function ExercisePage() {
  const { exerciseId } = useParams()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const { jobsheet, programmingLanguage, updateExercise, submission, trackActivity, liveWorkspace, readOnly } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExercise: (exerciseId: string, data: StepData) => Promise<void>
    submission: JobsheetSubmission
    trackActivity?: (activityType: string, opts?: { experimentId?: string | null; instructionId?: string | null; metadata?: Record<string, any> }) => Promise<void>
    liveWorkspace?: ReturnType<typeof connectLiveWorkspaceSocket> | null
    readOnly?: boolean
  }>()

  const exercise = jobsheet.exercises.find(exe => exe.id === exerciseId)

  const initialStep =
    exercise
      ? submission.report?.exercises?.[exercise.id]
      : undefined

  if (!exercise || !exerciseId) {
    return <NotFoundPage />
  }
  const kelasPraktikumId = jobsheet.kelasPraktikumId || searchParams.get("kelasPraktikumId") || ""

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <span>{exercise.title}</span>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
            Bobot: {exercise.rubric ?? 0}%
          </span>
        </h2>
        {exercise.instructionContent && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <RichTextViewer content={exercise.instructionContent} mode="viewer-default" />
          </div>
        )}
      </div>

      <InstructionWorkspaceCard
        key={exercise.id}
        instructions={[{ content: exercise.instructionContent, needsCode: true }]}
        templateCode={exercise.defaultTemplateCode || ''}
        language={programmingLanguage}
        initialSteps={initialStep ? [initialStep] : undefined}
        onChange={(steps) => updateExercise(exerciseId, steps[0])}
        onSave={() => trackActivity?.("save_code", { instructionId: exerciseId })}
        liveWorkspace={liveWorkspace}
        liveSection={{ type: "exercise", id: exerciseId, name: exercise.title }}
        readOnly={readOnly}
        runContext={kelasPraktikumId ? {
          jobsheetId: jobsheet.id,
          kelasPraktikumId,
          attemptType: jobsheet.access?.attemptType ?? "normal",
          remedialId: jobsheet.access?.remedialId ?? null,
          moduleType: "exercise",
          exerciseId,
        } : undefined}
      />
    </div>
  )
}
