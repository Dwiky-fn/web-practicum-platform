import type { JobsheetSubmission } from "../../../../../../../../entities/jobsheetSubmission/types"

interface Props {
  submission: JobsheetSubmission
}

export default function ReviewCommentPanel({ submission }: Props) {
  const comments = submission.review?.comments ?? []

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-4 py-3 border-b font-semibold text-gray-800">
        Komentar Dosen
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-100 overflow-auto">

        {comments.length > 0 ? (
          comments.map((c, idx) => (
            <div
              key={idx}
              className="p-3 border rounded-md bg-yellow-50"
            >
              <p className="text-xs text-gray-500 mb-1">
                {c.experimentId
                  ? `Percobaan ${c.experimentId} - Step ${c.step}`
                  : c.exerciseId
                  ? `Latihan ${c.exerciseId}`
                  : "Umum"}
              </p>

              <p className="text-sm text-gray-700">
                {c.comment}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 italic">
            Tidak ada komentar
          </p>
        )}

      </div>
    </div>
  )
}