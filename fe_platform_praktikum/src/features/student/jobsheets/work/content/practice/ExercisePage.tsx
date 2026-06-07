import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import NotFoundPage from "../../../../../not-found/NotFoundPage"
import RichTextViewer from "../../../../../../components/editor/RichTextViewer"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export default function ExercisePage() {
  const { exerciseId } = useParams()
  const { jobsheet, programmingLanguage, updateExercise, submission } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExercise: (exerciseId: string, data: StepData) => Promise<void>
    submission: JobsheetSubmission
  }>()

  const exercise = jobsheet.exercises.find(exe => exe.id === exerciseId)

  const initialStep =
    exercise
      ? submission.report?.exercises?.[exercise.id]
      : undefined

  if (!exercise || !exerciseId) {
    return <NotFoundPage />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {`Latihan: ${exercise.title}`}
        </h2>
        {exercise.instructionContent && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <RichTextViewer content={exercise.instructionContent} mode="viewer-default" />
          </div>
        )}
      </div>

      <InstructionWorkspaceCard
        key={exercise.id}
        title={exercise.title}
        label="Latihan"
        instructions={[exercise.instructionContent]}
        templateCode={exercise.defaultTemplateCode || ''}
        language={programmingLanguage}
        initialSteps={initialStep ? [initialStep] : undefined}
        onChange={(steps) => updateExercise(exerciseId, steps[0])}
      />
    </div>
  )
}
