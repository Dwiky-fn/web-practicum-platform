import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JSONContent } from "@tiptap/core"
import type { JobsheetSubmission } from "../../../../../../entities/jobsheetSubmission/types"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import NotFoundPage from "../../../../../not-found/NotFoundPage"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"

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
    updateExercise: (exerciseId: string, data: StepData) => void
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {exercise.title}
      </h1>

      <div className="max-w-3xl">

        {exercise.instructionContent && (
          <RichTextViewer
            content={exercise.instructionContent}
            mode="viewer-default"
          />
        )}
        <InstructionWorkspaceCard
          key={exercise.id}
          instructions={[exercise.instructionContent]}
          templateCode={exercise.defaultTemplateCode || ''}
          language={programmingLanguage}
          initialSteps={initialStep ? [initialStep] : undefined}
          onChange={(steps) => {
            updateExercise(exerciseId, steps[0])
          }}
        />
      </div>
    </div>
  )
}