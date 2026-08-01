import { MessageSquare, Clipboard, Award, CheckCircle2, AlertTriangle, Clock, UserCheck } from "lucide-react"
import type { ReviewFeedback } from "../../../../../../../../services/reviewFeedbackService"
import type { JobsheetSubmission } from "../../../../../../../../services/submission/types"

interface Props {
  feedbacks: ReviewFeedback[]
  review?: JobsheetSubmission["review"]
  onClickItem: (scope: "code" | "experiment" | "jobsheet") => void
}

export default function ReviewSummaryBanner({ feedbacks, review, onClickItem }: Props) {
  // Filter published/resolved comments
  const visible = feedbacks.filter((f) => f.status === "published" || f.status === "resolved")

  const codeCount = visible.filter((f) => f.scope === "code").length
  const expCount = visible.filter((f) => f.scope === "experiment").length
  const jobCount = visible.filter((f) => f.scope === "jobsheet").length

  const decision = review?.decision
  const finalScore = review?.finalScore
  const lecturerFeedback = review?.lecturerFeedback

  const renderDecisionBadge = () => {
    if (decision === "ACCEPTED") {
      return (
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>HASIL PRAKTIKUM DITERIMA</span>
        </div>
      )
    }
    if (decision === "REVISION") {
      return (
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs">
          <AlertTriangle size={16} className="text-amber-600" />
          <span>PERLU REVISI LAPORAN</span>
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-700 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs">
        <Clock size={16} className="text-blue-600" />
        <span>MENUNGGU PENILAIAN DOSEN</span>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white via-gray-50/50 to-blue-50/20 border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header Row: Decision Badge & Score */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {renderDecisionBadge()}
            <span className="text-xs text-gray-500 font-medium">Evaluasi Dosen</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Review Hasil Pengerjaan Jobsheet
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
            {decision === "ACCEPTED"
              ? "Selamat! Pengerjaan praktikum Anda telah diterima oleh Dosen Pembimbing."
              : decision === "REVISION"
              ? "Dosen memberikan catatan perbaikan pada laporan Anda. Silakan pelajari masukan di bawah ini."
              : "Laporan pengerjaan Anda telah tersimpan dan sedang menunggu pemeriksaan oleh Dosen."}
          </p>
        </div>

        {/* Score Badge */}
        {finalScore !== undefined && finalScore !== null && (
          <div className="shrink-0 flex items-center gap-3 bg-white border border-gray-200/90 rounded-2xl p-4 shadow-sm self-start md:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Nilai Akhir</div>
              <div className="text-2xl font-black text-blue-600 tracking-tight">{finalScore} <span className="text-sm font-bold text-gray-400">/ 100</span></div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-lg shadow-2xs">
              {finalScore >= 85 ? "A" : finalScore >= 75 ? "B" : finalScore >= 65 ? "C" : "D"}
            </div>
          </div>
        )}
      </div>

      {/* Lecturer Note if available */}
      {lecturerFeedback && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
          <UserCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-950 block">Catatan Dosen Pembimbing:</span>
            <p className="leading-relaxed text-blue-900/90 whitespace-pre-line">{lecturerFeedback}</p>
          </div>
        </div>
      )}

      {/* Quick Nav Category Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-xs font-semibold text-gray-500">Kategori Feedback:</span>
        <div className="flex flex-wrap gap-2.5 select-none">
          <button
            onClick={() => onClickItem("code")}
            className="flex items-center gap-2 bg-white hover:bg-blue-50/80 border border-gray-200 hover:border-blue-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-blue-700 cursor-pointer transition shadow-2xs"
          >
            <MessageSquare size={14} className="text-blue-500" />
            <span>{codeCount} Komentar Kode</span>
          </button>

          <button
            onClick={() => onClickItem("experiment")}
            className="flex items-center gap-2 bg-white hover:bg-emerald-50/80 border border-gray-200 hover:border-emerald-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-emerald-700 cursor-pointer transition shadow-2xs"
          >
            <Clipboard size={14} className="text-emerald-500" />
            <span>{expCount} Feedback Percobaan</span>
          </button>

          <button
            onClick={() => onClickItem("jobsheet")}
            className="flex items-center gap-2 bg-white hover:bg-indigo-50/80 border border-gray-200 hover:border-indigo-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-indigo-700 cursor-pointer transition shadow-2xs"
          >
            <Award size={14} className="text-indigo-500" />
            <span>{jobCount || lecturerFeedback ? "Feedback Umum Tersedia" : "Tidak Ada Feedback Umum"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

