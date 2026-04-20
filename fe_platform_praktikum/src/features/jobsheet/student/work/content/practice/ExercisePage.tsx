import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../entities/jobsheet/types"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"
import type { JSONContent } from "@tiptap/core"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export default function ExercisePage() {
  const { exerciseId } = useParams()
  const { jobsheet, programmingLanguage, updateExercise } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    updateExercise: (exerciseId: string, data: StepData) => void
  }>()

  const exercise = jobsheet.exercises.find(exe => exe.id === exerciseId)

  if (!exercise) {
    return <div>Exercise not found</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {exercise.title}
      </h1>

      <div className="max-w-3xl">
        <RichTextViewer
          content={exercise.instructionContent}
          mode="viewer-default"
        />

        <InstructionWorkspaceCard
          key={exercise.id}
          instructions={[exercise.instructionContent]}
          templateCode={exercise.defaultTemplateCode || ''}
          language={programmingLanguage}
          onChange={(steps) => {
            const step = steps[0] // karena exercise cuma 1
            updateExercise(exercise.id, step)
          }}
        />
      </div>
    </div>
  )
}