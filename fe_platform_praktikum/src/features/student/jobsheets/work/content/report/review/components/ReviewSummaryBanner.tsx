import { MessageSquare, Clipboard, Award, ShieldCheck } from "lucide-react"
import type { ReviewFeedback } from "../../../../../../../../services/reviewFeedbackService"

interface Props {
  feedbacks: ReviewFeedback[]
  onClickItem: (scope: "code" | "experiment" | "jobsheet") => void
}

export default function ReviewSummaryBanner({ feedbacks, onClickItem }: Props) {
  // Filter published/resolved comments
  const visible = feedbacks.filter((f) => f.status === "published" || f.status === "resolved")

  const codeCount = visible.filter((f) => f.scope === "code").length
  const expCount = visible.filter((f) => f.scope === "experiment").length
  const jobCount = visible.filter((f) => f.scope === "jobsheet").length

  if (visible.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-sm shadow-xs">
        <ShieldCheck size={18} className="text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold">Review Berlangsung:</span> Jobsheet sedang diperiksa oleh Dosen. Feedback akan muncul setelah dipublikasikan.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h4 className="font-semibold text-gray-800 text-sm md:text-base">
          Ringkasan Review Jobsheet
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Dosen telah mempublikasikan review untuk jobsheet praktikum Anda. Klik salah satu kategori untuk menuju detailnya.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 select-none">
        {/* Code Feedbacks Stats */}
        <div
          onClick={() => onClickItem("code")}
          className="flex items-center gap-2 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100/50 rounded-xl px-4 py-2 text-xs font-bold text-blue-700 cursor-pointer transition"
        >
          <MessageSquare size={14} className="text-blue-500" />
          <span>{codeCount} Komentar Kode</span>
        </div>

        {/* Experiment Feedbacks Stats */}
        <div
          onClick={() => onClickItem("experiment")}
          className="flex items-center gap-2 bg-green-50/70 hover:bg-green-100/70 border border-green-100/50 rounded-xl px-4 py-2 text-xs font-bold text-green-700 cursor-pointer transition"
        >
          <Clipboard size={14} className="text-green-500" />
          <span>{expCount} Feedback Percobaan</span>
        </div>

        {/* Jobsheet Level Feedback Stats */}
        <div
          onClick={() => onClickItem("jobsheet")}
          className="flex items-center gap-2 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100/50 rounded-xl px-4 py-2 text-xs font-bold text-indigo-700 cursor-pointer transition"
        >
          <Award size={14} className="text-indigo-500" />
          <span>{jobCount ? "Ada Feedback Umum" : "Tidak Ada Feedback Umum"}</span>
        </div>
      </div>
    </div>
  )
}
