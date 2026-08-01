import { useState, useEffect, useRef } from "react"
import { Trash2, Sparkles, User, FileEdit, MessageSquare, Pencil } from "lucide-react"

import { LecturerButton } from "../LecturerUI"
import { toast } from "../../../../components/toast/toastStore"
import type { ReviewFeedback } from "../../../../services/reviewFeedbackService"
import type { SelectedLineRange } from "./CodeReviewBlock"

interface Props {
  experiments: Array<{ id: string; title: string }>
  exercises?: Array<{ id: string; title: string }>
  feedbacks: ReviewFeedback[]
  activeFeedbackId: string | null
  onSelectFeedback: (id: string | null) => void
  selectedLineRange: SelectedLineRange | null
  onClearSelection: () => void
  onCreateFeedback: (payload: any) => Promise<any>
  onUpdateFeedback: (id: string, payload: any) => Promise<any>
  onDeleteFeedback: (id: string) => Promise<void>
  onPublishFeedback: (id: string) => Promise<any>
  onPublishMultipleFeedbacks: (ids: string[]) => Promise<void>

  activeExperimentId: string | null
  onSetActiveExperimentId: (id: string | null) => void
  score: string
  saving: boolean
  onSaveReview: (decision: "ACCEPTED") => void
  activeTab: "percobaan" | "komentar_kode" | "jobsheet"
  onTabChange: (tab: "percobaan" | "komentar_kode" | "jobsheet") => void
  submissionId: string
  readOnly?: boolean
  aiScore?: number
  aiScoreSummary?: {
    totalScoreRecommendation?: number
    totalMaxScore?: number
    finalGradeRecommendation?: number
  }
  automaticFinalScore?: number
}

export default function ReviewSidePanel({
  experiments,
  exercises = [],
  feedbacks,
  activeFeedbackId,
  onSelectFeedback,
  selectedLineRange,
  onClearSelection,
  onCreateFeedback,
  onUpdateFeedback,
  onDeleteFeedback,

  activeExperimentId,
  onSetActiveExperimentId,
  score,
  saving,
  onSaveReview,
  activeTab,
  onTabChange,
  submissionId,
  readOnly = false,
  aiScore,
  aiScoreSummary,
  automaticFinalScore = 0,
}: Props) {
  // ── Inline code comment editor state ──
  const [inlineComment, setInlineComment] = useState("")
  const [isEditingCode, setIsEditingCode] = useState(false)
  // ── Delete comment confirm state ──
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null)
  const confirmDeleteRef = useRef<HTMLDivElement | null>(null)

  // ── Experiment-level feedback local state (controlled per blur save) ──
  const [expContent, setExpContent] = useState("")
  const [expStrengths, setExpStrengths] = useState("")
  const [expIssues, setExpIssues] = useState("")
  const [expSuggestions, setExpSuggestions] = useState("")

  // ── Jobsheet-level feedback local state ──
  const [jobContent, setJobContent] = useState("")
  const [jobStrengths, setJobStrengths] = useState("")
  const [jobIssues, setJobIssues] = useState("")
  const [jobSuggestions, setJobSuggestions] = useState("")



  const activeFeedback = feedbacks.find((f) => f.id === activeFeedbackId) ?? null

  // Helper for split lists
  const parseList = (str: string) =>
    str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

  const getStepLabel = (codeBlockId?: string | null) => {
    if (!codeBlockId) return ""
    if (codeBlockId.startsWith("step-")) {
      const num = parseInt(codeBlockId.replace("step-", ""), 10)
      if (!isNaN(num)) {
        return `Langkah ${num + 1}`
      }
    }
    if (codeBlockId.startsWith("code-")) {
      return "Langkah 1"
    }
    return ""
  }

  // ── When line range is selected, switch to komentar_kode tab ──
  useEffect(() => {
    if (selectedLineRange) {
      onTabChange("komentar_kode")
      setIsEditingCode(false)
      setInlineComment("")
    }
  }, [selectedLineRange])

  // ── When active feedback changes ──
  useEffect(() => {
    if (activeFeedback) {
      if (activeFeedback.scope === "code") {
        onTabChange("komentar_kode")
        // Only switch tab, don't enter edit mode automatically
      } else if (activeFeedback.scope === "experiment") {
        onTabChange("percobaan")
        onSetActiveExperimentId(activeFeedback.experimentId ?? null)
      } else if (activeFeedback.scope === "jobsheet") {
        onTabChange("jobsheet")
      }
    }
  }, [activeFeedbackId])

  // ── Load experiment feedback when active experiment changes ──
  useEffect(() => {
    if (activeExperimentId && activeTab === "percobaan") {
      const existing = feedbacks.find(
        (f) => f.experimentId === activeExperimentId && f.scope === "experiment"
      )
      if (existing) {
        setExpContent(existing.content)
        setExpStrengths(existing.strengths?.join(", ") ?? "")
        setExpIssues(existing.issues?.join(", ") ?? "")
        setExpSuggestions(existing.suggestions?.join(", ") ?? "")
      } else {
        setExpContent("")
        setExpStrengths("")
        setExpIssues("")
        setExpSuggestions("")
      }
    }
  }, [activeExperimentId, activeTab, feedbacks])

  // ── Load jobsheet feedback when jobsheet tab becomes active ──
  useEffect(() => {
    if (activeTab === "jobsheet") {
      const existing = feedbacks.find((f) => f.scope === "jobsheet")
      if (existing) {
        setJobContent(existing.content)
        setJobStrengths(existing.strengths?.join(", ") ?? "")
        setJobIssues(existing.issues?.join(", ") ?? "")
        setJobSuggestions(existing.suggestions?.join(", ") ?? "")
      } else {
        setJobContent("")
        setJobStrengths("")
        setJobIssues("")
        setJobSuggestions("")
      }
    }
  }, [activeTab, feedbacks])

  // ── Auto-save experiment feedback on blur ──
  const handleExpBlur = async () => {
    if (!activeExperimentId || !expContent.trim() || readOnly) return
    const existing = feedbacks.find(
      (f) =>
        f.experimentId === activeExperimentId &&
        f.scope === "experiment" &&
        (f.source === "lecturer" || f.source === "ai_edited_by_lecturer")
    )
    const payload = {
      submissionId,
      experimentId: activeExperimentId,
      scope: "experiment" as const,
      content: expContent.trim(),
      strengths: parseList(expStrengths),
      issues: parseList(expIssues),
      suggestions: parseList(expSuggestions),
      source: existing?.source === "ai" ? ("ai_edited_by_lecturer" as const) : ("lecturer" as const),
      status: "published" as const,
    }
    try {
      if (existing) {
        await onUpdateFeedback(existing.id, payload)
      } else {
        await onCreateFeedback(payload)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan feedback percobaan.")
    }
  }

  // ── Auto-save jobsheet feedback on blur ──
  const handleJobBlur = async () => {
    if (!jobContent.trim() || readOnly) return
    const existing = feedbacks.find(
      (f) =>
        f.scope === "jobsheet" &&
        (f.source === "lecturer" || f.source === "ai_edited_by_lecturer")
    )
    const payload = {
      submissionId,
      scope: "jobsheet" as const,
      content: jobContent.trim(),
      strengths: parseList(jobStrengths),
      issues: parseList(jobIssues),
      suggestions: parseList(jobSuggestions),
      source: existing?.source === "ai" ? ("ai_edited_by_lecturer" as const) : ("lecturer" as const),
      status: "published" as const,
    }
    try {
      if (existing) {
        await onUpdateFeedback(existing.id, payload)
      } else {
        await onCreateFeedback(payload)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan feedback jobsheet.")
    }
  }

  // ── Handle Save Inline Code Comment ──
  const handleSaveInlineComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inlineComment.trim()) return

    try {
      if (isEditingCode && activeFeedback) {
        const source = activeFeedback.source === "ai" ? "ai_edited_by_lecturer" : activeFeedback.source
        await onUpdateFeedback(activeFeedback.id, {
          content: inlineComment.trim(),
          source,
          status: "published" as const,
        })
        onSelectFeedback(null)
      } else if (selectedLineRange) {
        await onCreateFeedback({
          submissionId,
          experimentId: selectedLineRange.experimentId,
          codeBlockId: selectedLineRange.codeBlockId,
          fileName: selectedLineRange.fileName,
          scope: "code",
          startLine: selectedLineRange.startLine,
          endLine: selectedLineRange.endLine,
          selectedCode: selectedLineRange.selectedCode,
          content: inlineComment.trim(),
          source: "lecturer",
          status: "published" as const,
        })
        onClearSelection()
      }
      setInlineComment("")
      setIsEditingCode(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan komentar kode.")
    }
  }

  // Get code feedbacks for currently selected experiment
  const currentExpCodeFeedbacks = feedbacks.filter(
    (f) => f.scope === "code" && f.experimentId === activeExperimentId
  )

  // Get ALL code feedbacks (for Komentar Kode tab without filter)
  const allCodeFeedbacks = feedbacks.filter((f) => f.scope === "code")

  const renderSourceBadge = (source: string) => {
    switch (source) {
      case "ai":
        return (
          <span className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-100">
            <Sparkles size={8} />AI
          </span>
        )
      case "ai_edited_by_lecturer":
        return (
          <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-100">
            <FileEdit size={8} />AI+Ed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
            <User size={8} />Dosen
          </span>
        )
    }
  }

  return (
    <div className="sticky top-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[calc(100vh-120px)] w-full max-w-[400px]">
      {/* Header Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200 text-[11px] font-bold select-none">
        {(
          [
            { id: "percobaan", label: "Percobaan / Latihan" },
            { id: "komentar_kode", label: "Komentar Kode" },
            { id: "jobsheet", label: "Jobsheet" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex-1 text-center py-3 border-r border-gray-200 transition-colors ${
              activeTab === t.id
                ? "bg-white text-blue-700 border-b-2 border-b-blue-600"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>



      {/* Main Content Area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {/* Experiment/Exercise selector */}
        {activeTab === "percobaan" && (
          <label className="block text-xs font-semibold text-gray-700">
            Pilih Percobaan / Latihan
            <select
              value={activeExperimentId || ""}
              onChange={(e) => onSetActiveExperimentId(e.target.value || null)}
              className="mt-1 h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs"
            >
              <option value="">-- Pilih Percobaan / Latihan --</option>
              <optgroup label="Percobaan">
                {experiments.map((e, idx) => (
                  <option key={e.id} value={e.id}>
                    Percobaan {idx + 1}: {e.title}
                  </option>
                ))}
              </optgroup>
              {exercises.length > 0 && (
                <optgroup label="Latihan">
                  {exercises.map((e, idx) => (
                    <option key={e.id} value={e.id}>
                      Latihan {idx + 1}: {e.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        )}

        {/* ════ TAB 1: PERCOBAAN / LATIHAN ════ */}
        {/* ════ TAB 1: PERCOBAAN / LATIHAN ════ */}
        {activeTab === "percobaan" && (
          <div className="space-y-4">

            {activeExperimentId ? (
              <>
                {/* ── Feedback Latihan / Percobaan form ── */}
                {readOnly ? (
                  <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="font-bold text-xs text-gray-700 uppercase">Feedback Percobaan / Latihan</h5>
                    {expContent ? (
                      <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{expContent}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Belum ada feedback yang disimpan.</p>
                    )}
                    {expStrengths && (
                      <div className="text-xs">
                        <span className="font-bold text-green-700">Kelebihan:</span>
                        <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                          {parseList(expStrengths).map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {expIssues && (
                      <div className="text-xs">
                        <span className="font-bold text-red-700">Kekurangan:</span>
                        <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                          {parseList(expIssues).map((iss, i) => <li key={i}>{iss}</li>)}
                        </ul>
                      </div>
                    )}
                    {expSuggestions && (
                      <div className="text-xs">
                        <span className="font-bold text-blue-700">Saran:</span>
                        <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                          {parseList(expSuggestions).map((sg, i) => <li key={i}>{sg}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                    <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Feedback Percobaan / Latihan</h5>

                    <label className="block text-xs font-medium text-gray-700">
                      Ringkasan / Evaluasi Utama
                      <textarea
                        value={expContent}
                        onChange={(e) => setExpContent(e.target.value)}
                        onBlur={handleExpBlur}
                        placeholder="Tulis ringkasan feedback utama untuk percobaan ini..."
                        rows={3}
                        className="mt-1 w-full p-2 text-xs rounded-lg border border-gray-300 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block text-xs font-medium text-gray-700">
                      Kelebihan (pisahkan dengan koma)
                      <input
                        value={expStrengths}
                        onChange={(e) => setExpStrengths(e.target.value)}
                        onBlur={handleExpBlur}
                        placeholder="Contoh: Logika runut, Output presisi"
                        className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                      />
                    </label>

                    <label className="block text-xs font-medium text-gray-700">
                      Kekurangan (pisahkan dengan koma)
                      <input
                        value={expIssues}
                        onChange={(e) => setExpIssues(e.target.value)}
                        onBlur={handleExpBlur}
                        placeholder="Contoh: Analisis minim, Variabel tidak konsisten"
                        className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                      />
                    </label>

                    <label className="block text-xs font-medium text-gray-700">
                      Saran / Catatan (pisahkan dengan koma)
                      <input
                        value={expSuggestions}
                        onChange={(e) => setExpSuggestions(e.target.value)}
                        onBlur={handleExpBlur}
                        placeholder="Contoh: Tingkatkan kerapian indentasi, Pelajari optimalisasi logic"
                        className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                      />
                    </label>

                    <p className="text-[10px] text-gray-400 italic">
                      💡 Disimpan otomatis saat Anda berpindah field.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-[11px] bg-gray-50 rounded-xl border border-gray-100">
                Pilih percobaan di atas untuk mulai memberikan feedback per percobaan.
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 2: KOMENTAR KODE ════ */}
        {activeTab === "komentar_kode" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-gray-700 flex items-center gap-1">
                  <MessageSquare size={12} className="text-blue-500" />
                  Komentar Kode
                  {allCodeFeedbacks.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {allCodeFeedbacks.length}
                    </span>
                  )}
                </h5>
              </div>

              {/* Inline comment creator (shown when a line range is selected or editing) */}
              {(selectedLineRange || isEditingCode) && !readOnly && (
                <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-xs text-blue-900 font-sans uppercase tracking-wide">
                      {isEditingCode ? "Edit Komentar Kode" : "Komentar Kode Baru"}
                    </h4>
                    <button
                      onClick={() => {
                        onClearSelection()
                        onSelectFeedback(null)
                        setIsEditingCode(false)
                        setInlineComment("")
                      }}
                      className="text-[10px] text-gray-500 hover:text-red-600 font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                  <div className="text-[11px] text-gray-600 space-y-1">
                    <p>
                      <span className="font-semibold">File:</span>{" "}
                      {selectedLineRange?.fileName || activeFeedback?.fileName}
                    </p>
                    <p>
                      <span className="font-semibold">Baris:</span>{" "}
                      {selectedLineRange
                        ? `${selectedLineRange.startLine}-${selectedLineRange.endLine}`
                        : `${activeFeedback?.startLine}-${activeFeedback?.endLine}`}
                    </p>
                    {selectedLineRange?.selectedCode && (
                      <pre className="mt-1 bg-white p-2 rounded border border-gray-100 text-[10px] text-gray-800 overflow-x-auto whitespace-pre-wrap max-h-20">
                        {selectedLineRange.selectedCode}
                      </pre>
                    )}
                  </div>

                  <form onSubmit={handleSaveInlineComment} className="mt-3 space-y-2">
                    <textarea
                      id="inline-comment-textarea"
                      value={inlineComment}
                      onChange={(e) => setInlineComment(e.target.value)}
                      placeholder="Masukkan catatan feedback pada baris kode ini..."
                      rows={3}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-[11px]"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Code comments list for all experiments */}
              {allCodeFeedbacks.length === 0 && !selectedLineRange && !isEditingCode ? (
                <div className="text-center py-5 text-gray-400 italic text-[11px] bg-gray-50 rounded-xl border border-gray-100">
                  <p>Belum ada komentar kode.</p>
                  <p className="mt-1 text-[10px] text-gray-400">Sorot baris di blok kode untuk memberikan feedback.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allCodeFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      onClick={() => onSelectFeedback(fb.id)}
                      className={`p-3 border rounded-lg text-xs transition relative group cursor-pointer ${
                        activeFeedbackId === fb.id
                          ? "bg-yellow-50/50 border-yellow-400 ring-1 ring-yellow-200"
                          : "bg-white border-gray-200 hover:bg-gray-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex gap-1.5">
                          {renderSourceBadge(fb.source)}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!readOnly && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectFeedback(fb.id)
                                  setIsEditingCode(true)
                                  setInlineComment(fb.content)
                                }}
                                className="text-gray-400 hover:text-blue-500"
                                title="Edit komentar"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingFeedbackId(fb.id)
                                }}
                                className="text-gray-400 hover:text-red-500"
                                title="Hapus komentar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-gray-500 text-[10px] mb-1 font-sans">
                        {getStepLabel(fb.codeBlockId) ? `${getStepLabel(fb.codeBlockId)} · ` : ""}{fb.fileName} · Baris {fb.startLine}-{fb.endLine}
                      </div>
                      <p className="text-gray-700 leading-snug">{fb.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB 2: JOBSHEET ════ */}
        {activeTab === "jobsheet" && (
          <div className="space-y-4 font-sans">
            {/* Penilaian Akhir & Nilai AI */}
            <div className="bg-purple-50/35 border border-purple-100/60 rounded-xl p-3.5 space-y-3">
              <h5 className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={14} className="text-purple-600 fill-current" />
                <span>Penilaian Praktikum</span>
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nilai AI</span>
                  <span className="text-lg font-extrabold text-purple-700 flex items-center gap-1.5 mt-0.5">
                    {aiScoreSummary?.finalGradeRecommendation ?? (aiScore != null ? Math.min(100, Math.max(0, aiScore)) : "-")}
                    {aiScore != null || aiScoreSummary?.finalGradeRecommendation != null ? <span className="text-xs font-bold text-purple-500">/100</span> : null}
                  </span>
                  {aiScoreSummary?.totalMaxScore ? (
                    <span className="mt-0.5 block text-[10px] font-semibold text-gray-500">
                      Total poin: {aiScoreSummary.totalScoreRecommendation ?? 0}/{aiScoreSummary.totalMaxScore}
                    </span>
                  ) : null}
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nilai Akhir Otomatis</span>
                  <span className="text-lg font-extrabold text-green-700 block mt-0.5">
                    {readOnly ? (score || "-") : automaticFinalScore}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-gray-500">
                    Dihitung dari Dasar Teori + Percobaan + Latihan.
                  </span>
                </div>
              </div>
            </div>

            {readOnly ? (
              <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h5 className="font-bold text-xs text-gray-700 uppercase">Feedback Keseluruhan Jobsheet</h5>
                {jobContent ? (
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{jobContent}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada feedback jobsheet yang disimpan.</p>
                )}
                {jobStrengths && (
                  <div className="text-xs">
                    <span className="font-bold text-green-700">Kelebihan Utama:</span>
                    <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                      {parseList(jobStrengths).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {jobIssues && (
                  <div className="text-xs">
                    <span className="font-bold text-red-700">Kekurangan Utama:</span>
                    <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                      {parseList(jobIssues).map((iss, i) => <li key={i}>{iss}</li>)}
                    </ul>
                  </div>
                )}
                {jobSuggestions && (
                  <div className="text-xs">
                    <span className="font-bold text-blue-700">Saran & Rekomendasi:</span>
                    <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                      {parseList(jobSuggestions).map((sg, i) => <li key={i}>{sg}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Feedback Keseluruhan</h5>

                  <label className="block text-xs font-medium text-gray-700">
                    Evaluasi Akhir Dosen
                    <textarea
                      value={jobContent}
                      onChange={(e) => setJobContent(e.target.value)}
                      onBlur={handleJobBlur}
                      placeholder="Tulis ringkasan catatan akhir dosen mengenai pemahaman dan konsistensi mahasiswa..."
                      rows={4}
                      className="mt-1 w-full p-2 text-xs rounded-lg border border-gray-300 outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block text-xs font-medium text-gray-700">
                    Kelebihan Utama (pisahkan dengan koma)
                    <input
                      value={jobStrengths}
                      onChange={(e) => setJobStrengths(e.target.value)}
                      onBlur={handleJobBlur}
                      placeholder="Contoh: Pemahaman materi kuat, Logika clean"
                      className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                    />
                  </label>

                  <label className="block text-xs font-medium text-gray-700">
                    Kekurangan Utama (pisahkan dengan koma)
                    <input
                      value={jobIssues}
                      onChange={(e) => setJobIssues(e.target.value)}
                      onBlur={handleJobBlur}
                      placeholder="Contoh: Beberapa output salah, Analisis parsial"
                      className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                    />
                  </label>

                  <label className="block text-xs font-medium text-gray-700">
                    Rekomendasi / Catatan (pisahkan dengan koma)
                    <input
                      value={jobSuggestions}
                      onChange={(e) => setJobSuggestions(e.target.value)}
                      onBlur={handleJobBlur}
                      placeholder="Contoh: Perdalam konsep OOP, Pelajari clean code"
                      className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                    />
                  </label>

                  <p className="text-[10px] text-gray-400 italic">
                    💡 Disimpan otomatis saat Anda berpindah field.
                  </p>
                </div>

                {/* Save Overall Review button */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <LecturerButton
                    className="w-full py-2 text-xs bg-green-600 hover:bg-green-700 text-white border-none"
                    disabled={saving}
                    onClick={() => onSaveReview("ACCEPTED")}
                  >
                    {saving ? "Menyimpan..." : "Simpan & Publish Penilaian"}
                  </LecturerButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Comment Confirm Modal ── */}
      {deletingFeedbackId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeletingFeedbackId(null)}
        >
          <div
            ref={confirmDeleteRef}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-72 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Hapus Komentar</h3>
                <p className="text-xs text-gray-500 mt-0.5">Komentar kode ini akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeletingFeedbackId(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFeedback(deletingFeedbackId)
                  setDeletingFeedbackId(null)
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
