import { useParams, useOutletContext } from "react-router-dom"
import type { Jobsheet } from "../../../../../../entities/jobsheet/types"
import RichTextViewer from "../../../../../../shared/editor/RichTextViewer"

export default function TheoryPage() {
  const { theoryId } = useParams()
  const { jobsheet } = useOutletContext<{
    jobsheet: Jobsheet
    programmingLanguage: string
  }>()
  
  const theory = jobsheet.theory.find(t => t.id === theoryId)

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

      <RichTextViewer
        content={theory.content}
        mode="viewer-theory"
      />
    </div>
  );
}