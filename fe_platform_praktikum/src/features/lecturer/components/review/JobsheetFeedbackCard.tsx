import { Sparkles, User, FileEdit } from "lucide-react"
import type { ReviewFeedback } from "../../../../services/reviewFeedbackService"

interface Props {
  feedbacks: ReviewFeedback[]
  readOnly?: boolean
  activeFeedbackId?: string | null
  onSelectFeedback?: (feedbackId: string) => void
  onOpenJobsheetEditor?: () => void
  lecturerFeedback?: string
}

export default function JobsheetFeedbackCard({
  feedbacks,
  readOnly = false,
  activeFeedbackId = null,
  onSelectFeedback,
  onOpenJobsheetEditor,
  lecturerFeedback,
}: Props) {
  // Filter jobsheet-level feedbacks
  const jobsheetFeedbacks = feedbacks.filter((f) => f.scope === "jobsheet")

  // Filter visible feedbacks for student vs lecturer
  const visibleFeedbacks = readOnly
    ? jobsheetFeedbacks.filter((f) => f.status === "published" || f.status === "resolved")
    : jobsheetFeedbacks

  const hasLecturerNote = Boolean(lecturerFeedback && lecturerFeedback.trim().length > 0)

  const renderSourceBadge = (source: string) => {
    switch (source) {
      case "ai":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
            <Sparkles size={10} />
            <span>AI DRAFT</span>
          </span>
        )
      case "ai_edited_by_lecturer":
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
            <FileEdit size={10} />
            <span>AI · Diedit Dosen</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
            <User size={10} />
            <span>Dosen</span>
          </span>
        )
    }
  }

  if (readOnly && visibleFeedbacks.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm my-6">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 text-sm md:text-base">
          Feedback Keseluruhan Jobsheet
        </h3>
        {!readOnly && onOpenJobsheetEditor && (
          <button
            onClick={onOpenJobsheetEditor}
            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold py-1.5 px-3 rounded-lg border border-blue-100 transition"
          >
            Tulis Feedback Jobsheet
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {hasLecturerNote && (
          <div className="p-4 border rounded-xl shadow-xs bg-blue-50/40 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              {renderSourceBadge("lecturer")}
              <span className="text-xs font-semibold text-blue-900">Catatan Ringkas Dosen</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line font-medium">
              {lecturerFeedback}
            </p>
          </div>
        )}

        {visibleFeedbacks.length > 0 ? (
          <div className="space-y-4">
            {visibleFeedbacks.map((fb) => (
              <div
                key={fb.id}
                onClick={() => onSelectFeedback?.(fb.id)}
                className={`p-4 border rounded-xl shadow-sm transition-all duration-200 cursor-pointer ${
                  activeFeedbackId === fb.id
                    ? "bg-yellow-50/50 border-yellow-400 ring-2 ring-yellow-200"
                    : "bg-gray-50/40 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    {renderSourceBadge(fb.source)}
                    {fb.status === "draft" && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        DRAFT
                      </span>
                    )}

                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(fb.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                  {fb.content}
                </p>

                {/* Lists */}
                <div className="grid gap-4 sm:grid-cols-3 text-xs border-t border-gray-100/50 pt-3">
                  {fb.strengths && fb.strengths.length > 0 && (
                    <div>
                      <span className="font-bold text-green-700 block mb-1">Kelebihan Utama:</span>
                      <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                        {fb.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {fb.issues && fb.issues.length > 0 && (
                    <div>
                      <span className="font-bold text-red-700 block mb-1">Kekurangan Utama:</span>
                      <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                        {fb.issues.map((iss, i) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {fb.suggestions && fb.suggestions.length > 0 && (
                    <div>
                      <span className="font-bold text-blue-700 block mb-1 font-sans">Saran & Rekomendasi:</span>
                      <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                        {fb.suggestions.map((sg, i) => (
                          <li key={i}>{sg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !hasLecturerNote ? (
          <p className="text-sm text-gray-400 italic text-center py-4">
            Belum ada feedback keseluruhan untuk laporan ini.
          </p>
        ) : null}
      </div>
    </div>
  )
}
