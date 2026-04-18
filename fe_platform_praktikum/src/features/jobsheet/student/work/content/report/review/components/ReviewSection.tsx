import type { JobsheetSubmission } from "../../../../../../../../entities/jobsheetSubmission/types"

interface Props {
  submission: JobsheetSubmission
}

export default function ReviewSection({ submission }: Props) {
  const review = submission.review

  if (!review) {
    return (
      <div className="bg-white border rounded-xl p-4">
        <p className="text-sm text-gray-500 italic">
          Belum ada hasil review
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Hasil Review
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">

        {/* Nilai */}
        <div className="flex justify-between">
          <span className="text-gray-600">Nilai Akhir</span>
          <span className="font-semibold text-gray-800">
            {review.finalScore}
          </span>
        </div>

        {/* Status */}
        <div className="flex justify-between">
          <span className="text-gray-600">Status</span>
          <span
            className={`font-semibold ${
              review.decision === "ACCEPTED"
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {review.decision}
          </span>
        </div>

        {/* Feedback Dosen */}
        <div>
          <p className="text-sm text-gray-600 mb-1">
            Feedback Dosen
          </p>

          <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-700">
            {review.lecturerFeedback || "Tidak ada catatan"}
          </div>
        </div>

      </div>
    </div>
  )
}