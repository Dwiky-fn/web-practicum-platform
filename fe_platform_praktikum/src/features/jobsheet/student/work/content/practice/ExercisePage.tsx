import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../entities/jobsheet/types"
import InstructionWorkspaceCard from "./components/InstructionWorkspaceCard"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"

export default function ExercisePage() {
  const { exerciseId } = useParams()
  const { jobsheet, programmingLanguage } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
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
        />
      </div>
    </div>
  )
}