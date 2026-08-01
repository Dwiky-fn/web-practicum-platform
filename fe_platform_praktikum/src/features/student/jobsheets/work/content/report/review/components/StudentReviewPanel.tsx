import { useState } from "react"
import { ChevronRight, Sparkles, User, FileEdit } from "lucide-react"
import type { ReviewFeedback } from "../../../../../../../../services/reviewFeedbackService"
import type { JobsheetSubmission } from "../../../../../../../../services/submission/types"

interface Props {
  feedbacks: ReviewFeedback[]
  submission: JobsheetSubmission
  activeFeedbackId: string | null
  onSelectFeedback: (id: string | null) => void
  isOpen: boolean
  onClose: () => void
  experiments: Array<{ id: string; title: string }>
  exercises?: Array<{ id: string; title: string }>
}

export default function StudentReviewPanel({
  feedbacks,
  submission,
  activeFeedbackId,
  onSelectFeedback,
  isOpen,
  onClose,
  experiments,
  exercises = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"komentar_kode" | "jobsheet">("komentar_kode")

  // Filter code-level feedbacks that are published or resolved
  const codeFeedbacks = feedbacks.filter(
    (f) => f.scope === "code" && (f.status === "published" || f.status === "resolved")
  )

  // Filter jobsheet-level feedback
  const jobsheetFeedback = feedbacks.find(
    (f) => f.scope === "jobsheet" && (f.status === "published" || f.status === "resolved")
  )

  const activeFeedback = feedbacks.find((f) => f.id === activeFeedbackId) ?? null

  const review = submission.review
  const finalScore = review?.finalScore ?? submission.score
  const aiScore = review?.aiFeedback?.aiScore ?? (submission.scoreBreakdown as any)?.aiScore

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

  const panelBody = (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-bold select-none">
        <button
          onClick={() => setActiveTab("komentar_kode")}
          className={`flex-1 text-center py-3 border-r border-gray-200 transition-colors ${
            activeTab === "komentar_kode"
              ? "bg-white text-blue-700 border-b-2 border-b-blue-600"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Komentar Kode ({codeFeedbacks.length})
        </button>
        <button
          onClick={() => setActiveTab("jobsheet")}
          className={`flex-1 text-center py-3 transition-colors ${
            activeTab === "jobsheet"
              ? "bg-white text-blue-700 border-b-2 border-b-blue-600"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Jobsheet
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
        {activeTab === "komentar_kode" && (
          <div className="space-y-3">
            {!codeFeedbacks.length ? (
              <div className="text-center py-8 text-gray-400 italic text-xs bg-gray-50/50 rounded-xl border border-gray-200 p-4">
                <p>Belum ada komentar pada kode program.</p>
              </div>
            ) : (
              <div className="space-y-3">
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

            {/* Selected Comment Overlay */}
            {activeFeedback && activeFeedback.scope === "code" && (
              <div className="border border-yellow-200 bg-yellow-50/35 rounded-xl p-3.5 space-y-2 mt-3">
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
        )}

        {activeTab === "jobsheet" && (
          <div className="space-y-4 font-sans text-xs">
            {/* Penilaian Praktikum Box */}
            <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 space-y-3">
              <h5 className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600 fill-current" />
                <span>PENILAIAN PRAKTIKUM</span>
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">NILAI AI</span>
                  <span className="text-lg font-extrabold text-purple-700 flex items-center gap-1 mt-0.5">
                    {aiScore ?? "-"} <span className="text-xs font-bold text-purple-500">/100</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">NILAI AKHIR</span>
                  <span className="text-lg font-extrabold text-emerald-700 block mt-0.5">
                    {finalScore ?? "-"}
                  </span>
                  <span className="mt-0.5 block text-[9px] font-semibold text-gray-500 leading-tight">
                    Dihitung dari Dasar Teori + Percobaan + Latihan.
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback Keseluruhan Jobsheet Box */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
              <h5 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                FEEDBACK KESELURUHAN JOBSHEET
              </h5>

              {jobsheetFeedback?.content || review?.lecturerFeedback ? (
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {jobsheetFeedback?.content || review?.lecturerFeedback}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">Belum ada feedback keseluruhan untuk laporan ini.</p>
              )}

              {jobsheetFeedback?.strengths && jobsheetFeedback.strengths.length > 0 && (
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="font-bold text-emerald-700 block mb-1">Kelebihan Utama:</span>
                  <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                    {jobsheetFeedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {jobsheetFeedback?.issues && jobsheetFeedback.issues.length > 0 && (
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="font-bold text-red-700 block mb-1">Kekurangan Utama:</span>
                  <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                    {jobsheetFeedback.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {jobsheetFeedback?.suggestions && jobsheetFeedback.suggestions.length > 0 && (
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="font-bold text-blue-700 block mb-1">Saran & Rekomendasi:</span>
                  <ul className="list-disc pl-4 text-gray-600 space-y-0.5">
                    {jobsheetFeedback.suggestions.map((sg, i) => (
                      <li key={i}>{sg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
        {panelBody}
      </div>

      {/* Desktop Column Rendering */}
      <div className="hidden lg:block sticky top-6 w-full">
        {panelBody}
      </div>
    </>
  )
}

