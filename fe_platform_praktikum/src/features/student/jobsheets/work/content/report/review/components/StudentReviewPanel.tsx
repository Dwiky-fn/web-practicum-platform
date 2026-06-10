import { MessageSquare, X, ChevronRight, Sparkles, User, FileEdit } from "lucide-react"
import type { ReviewFeedback } from "../../../../../../../../services/reviewFeedbackService"

interface Props {
  feedbacks: ReviewFeedback[]
  activeFeedbackId: string | null
  onSelectFeedback: (id: string | null) => void
  isOpen: boolean
  onClose: () => void
  experiments: Array<{ id: string; title: string }>
  exercises?: Array<{ id: string; title: string }>
}

export default function StudentReviewPanel({
  feedbacks,
  activeFeedbackId,
  onSelectFeedback,
  isOpen,
  onClose,
  experiments,
  exercises = [],
}: Props) {
  // Filter code-level feedbacks that are published or resolved
  const codeFeedbacks = feedbacks.filter(
    (f) => f.scope === "code" && (f.status === "published" || f.status === "resolved")
  )

  const activeFeedback = feedbacks.find((f) => f.id === activeFeedbackId) ?? null

  const getTaskLabel = (id?: string | null) => {
    if (!id) return ""
    const expIdx = experiments.findIndex((e) => e.id === id)
    if (expIdx !== -1) {
      return `Percobaan ${expIdx + 1}`
    }
    const exeIdx = exercises.findIndex((e) => e.id === id)
    if (exeIdx !== -1) {
      return `Latihan ${exeIdx + 1}`
    }
    return "Umum"
  }

  const renderSourceBadge = (source: string) => {
    switch (source) {
      case "ai":
        return <span className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-100"><Sparkles size={8} />AI</span>
      case "ai_edited_by_lecturer":
        return <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-100"><FileEdit size={8} />AI · Diedit Dosen</span>
      default:
        return <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100"><User size={8} />Dosen</span>
    }
  }

  const listContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
          <MessageSquare size={16} className="text-blue-600" />
          <span>Komentar Kode ({codeFeedbacks.length})</span>
        </h4>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {!codeFeedbacks.length ? (
        <p className="text-sm text-gray-400 italic text-center py-8 bg-gray-50 border rounded-xl">
          Belum ada komentar pada kode program.
        </p>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {codeFeedbacks.map((fb) => (
            <div
              key={fb.id}
              onClick={() => onSelectFeedback(fb.id)}
              className={`p-3 border rounded-xl text-xs transition cursor-pointer select-none ${
                activeFeedbackId === fb.id
                  ? "bg-yellow-50/50 border-yellow-400 ring-1 ring-yellow-200"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex gap-1.5">
                  {renderSourceBadge(fb.source)}

                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </div>

              <div className="text-[10px] text-gray-500 font-semibold mb-1">
                {getTaskLabel(fb.experimentId)} · {fb.fileName} · Baris {fb.startLine}-{fb.endLine}
              </div>

              <p className="text-gray-700 leading-snug font-sans">{fb.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selected Comment Details Overlay */}
      {activeFeedback && activeFeedback.scope === "code" && (
        <div className="border border-yellow-200 bg-yellow-50/35 rounded-xl p-3.5 space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-xs text-yellow-800">Detail Komentar Terpilih</h5>
            <button
              onClick={() => onSelectFeedback(null)}
              className="text-[10px] text-gray-500 hover:text-gray-700 font-semibold"
            >
              Tutup
            </button>
          </div>
          <p className="text-[11px] text-gray-500 font-sans">
            {getTaskLabel(activeFeedback.experimentId)} · {activeFeedback.fileName} · Baris {activeFeedback.startLine}-{activeFeedback.endLine}
          </p>
          {activeFeedback.selectedCode && (
            <pre className="text-[10px] bg-white border border-gray-100 p-2 rounded max-h-20 overflow-auto whitespace-pre font-mono text-gray-700">
              {activeFeedback.selectedCode}
            </pre>
          )}
          <p className="text-xs text-gray-800 leading-relaxed font-sans">{activeFeedback.content}</p>

        </div>
      )}
    </div>
  )

  // MOBILE DRAWERS / BOTTOM SHEET
  if (!isOpen) return null

  return (
    <>
      {/* Mobile Drawer Slide-in */}
      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity lg:hidden`}
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white p-5 shadow-2xl transition-transform lg:hidden overflow-y-auto">
        {listContent}
      </div>

      {/* Desktop Column Rendering */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto w-full">
        {listContent}
      </div>
    </>
  )
}
