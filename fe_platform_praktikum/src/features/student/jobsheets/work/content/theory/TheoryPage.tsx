import { useEffect } from "react"
import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import RichTextViewer from "../../../../../../components/editor/RichTextViewer"

export default function TheoryPage() {
  const { theoryId } = useParams()
  const { jobsheet, markProgressItemCompleted } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
    markProgressItemCompleted?: (item: { type: string; id: string }) => void
  }>()
  
  const theory = jobsheet.theory.find(t => t.id === theoryId)

  useEffect(() => {
    if (theoryId && markProgressItemCompleted) {
      markProgressItemCompleted({ type: "theory", id: theoryId })
    }
  }, [theoryId, markProgressItemCompleted])

  if (!theory) {
    return (
      <div className="text-gray-500">
        Materi tidak ditemukan.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-gray-800">
        {theory.title}
      </h1>
      <p className="text-sm font-semibold text-blue-700">
        Bobot: {theory.rubric ?? 0}%
      </p>

      <RichTextViewer
        content={theory.content}
        mode="viewer-theory"
      />
    </div>
  );
}
