import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, MessageSquare, AlertCircle, Sparkles, User, FileEdit, FileText } from "lucide-react"
import RichTextViewer from "../../../../components/editor/RichTextViewer"
import CodeReviewBlock from "./CodeReviewBlock"
import type { SelectedLineRange } from "./CodeReviewBlock"
import type { ReviewFeedback } from "../../../../services/reviewFeedbackService"
import { splitInstructionContent } from "../../../../shared/utils/splitInstructionContent"

const emptyDoc = { type: "doc" as const, content: [] }

interface Props {
  experiment: {
    id: string
    title: string
    order: number
    instructionContent?: any
  }
  steps: Array<{
    files: Record<string, string>
    output: string
    analysis: any
  }>
  feedbacks: ReviewFeedback[]
  readOnly?: boolean
  selectedLineRange?: SelectedLineRange | null
  activeFeedbackId?: string | null
  onSelectLines?: (range: SelectedLineRange) => void
  onSelectFeedback?: (feedbackId: string) => void
  onClearSelection?: () => void
  onOpenFeedbackEditor?: (experimentId: string) => void
  isExpandedByDefault?: boolean
  submissionId: string
  type?: "experiment" | "exercise"
  isStudent?: boolean
  rubric?: number
  evaluation?: {
    score: string
    feedback: string
  }
  aiRecommendation?: {
    score?: number | null
    maxScore?: number | null
    feedback?: string
  } | null
  onEvaluationChange?: (value: { score: string; feedback: string }) => void
  onAutoSave?: () => void
}

export default function ExperimentReviewCard({
  experiment,
  steps,
  feedbacks,
  readOnly = false,
  selectedLineRange = null,
  activeFeedbackId = null,
  onSelectLines,
  onSelectFeedback,
  onClearSelection,
  onOpenFeedbackEditor,
  isExpandedByDefault = false,
  submissionId,
  type = "experiment",
  isStudent = false,
  rubric = 0,
  evaluation,
  aiRecommendation,
  onEvaluationChange,
  onAutoSave,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(isExpandedByDefault)

  const parsedInstructions = experiment.instructionContent
    ? splitInstructionContent(experiment.instructionContent)
    : []

  useEffect(() => {
    setIsExpanded(isExpandedByDefault)
  }, [isExpandedByDefault])

  useEffect(() => {
    if (activeFeedbackId) {
      const hasActiveFeedback = feedbacks.some(
        (f) => f.id === activeFeedbackId && f.experimentId === experiment.id
      )
      if (hasActiveFeedback) {
        setIsExpanded(true)
      }
    }
  }, [activeFeedbackId, feedbacks, experiment.id])

  // Get active feedbacks for this experiment
  const experimentFeedbacks = feedbacks.filter(
    (f) => f.experimentId === experiment.id && f.scope === "experiment"
  )

  // Visible feedbacks for student vs lecturer
  const visibleFeedbacks = readOnly
    ? experimentFeedbacks.filter((f) => f.status === "published" || f.status === "resolved")
    : experimentFeedbacks

  // Total comment count inside this experiment (code + experiment levels)
  const totalComments = feedbacks.filter(
    (f) =>
      f.experimentId === experiment.id &&
      (!readOnly || f.status === "published" || f.status === "resolved")
  ).length

  // Helper for feedback source badges
  const renderSourceBadge = (source: string) => {
    switch (source) {
      case "ai":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100">
            <Sparkles size={10} />
            <span>AI DRAFT</span>
          </span>
        )
      case "ai_edited_by_lecturer":
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
            <FileEdit size={10} />
            <span>AI · Diedit Dosen</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
            <User size={10} />
            <span>Dosen</span>
          </span>
        )
    }
  };

  return (
    <div className="min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
      {/* Card Header (Accordion Control) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-5 py-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
          isExpanded ? "bg-gray-50 border-b border-gray-100" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
            {experiment.order}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm md:text-base">
              {type === "exercise" ? "Latihan" : "Percobaan"} {experiment.order}: {experiment.title}
            </h3>
            {totalComments > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                <MessageSquare size={12} className="text-blue-500 fill-current" />
                <span>{totalComments} Review</span>
              </span>
            )}
          </div>
        </div>

        <div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Card Content */}
      {isExpanded && (
        <div className="min-w-0 p-5 space-y-6">
          {/* Steps */}
          {!steps.length ? (
            <div className="flex items-center gap-2 text-gray-400 italic text-sm py-4">
              <AlertCircle size={16} />
              <span>Mahasiswa belum mengisi laporan untuk {type === "exercise" ? "latihan" : "percobaan"} ini.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {steps.map((step, idx) => {
                const stepInstruction = parsedInstructions[idx]
                const instructionDoc = stepInstruction?.content || (idx === 0 || parsedInstructions.length <= 1 ? experiment.instructionContent : null)

                const hasCodeFiles = Object.values(step.files ?? {}).some(c => typeof c === 'string' && Boolean(c.trim()))
                const needsCode = stepInstruction?.needsCode !== undefined
                  ? stepInstruction.needsCode
                  : (hasCodeFiles || Boolean(step.output?.trim()))

                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white shadow-2xs">
                    {/* Header Langkah / Soal */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                          {type === "exercise" ? "L" : idx + 1}
                        </span>
                        <span>{type === "exercise" ? "Soal / Instruksi Latihan" : `Langkah Ke-${idx + 1}`}</span>
                      </h4>
                      {!needsCode && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          Instruksi Teks / Non-Kode
                        </span>
                      )}
                    </div>

                    {/* 1. Instruksi Langkah Kerja */}
                    {instructionDoc && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-sm space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5 font-sans">
                          <FileText size={13} className="text-blue-700" />
                          <span>{type === "exercise" ? "Instruksi Latihan:" : `Instruksi Langkah ${idx + 1}:`}</span>
                        </p>
                        <div className="min-w-0 overflow-x-auto text-gray-800">
                          <RichTextViewer content={instructionDoc} role="MAHASISWA" mode="viewer-default" />
                        </div>
                      </div>
                    )}

                    {/* 2. Kode & Output Mahasiswa (HANYA jika instruksi membutuhkan kode) */}
                    {needsCode && (
                      <div className="space-y-4">
                        {/* Code Block for each file */}
                        {Object.entries(step.files ?? {}).map(([fileName, fileCode]) => (
                          <CodeReviewBlock
                            key={fileName}
                            submissionId={submissionId}
                            experimentId={experiment.id}
                            codeBlockId={`step-${idx}`}
                            fileName={fileName}
                            code={fileCode}
                            feedbacks={feedbacks}
                            readOnly={readOnly}
                            selectedLineRange={selectedLineRange}
                            activeFeedbackId={activeFeedbackId}
                            onSelectLines={onSelectLines}
                            onSelectFeedback={onSelectFeedback}
                            onClearSelection={onClearSelection}
                          />
                        ))}

                        {/* Output */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs md:text-sm">
                          <p className="font-semibold text-gray-700 mb-1">Output Program:</p>
                          <pre className="whitespace-pre-wrap font-mono text-gray-800 bg-white p-2 border border-gray-100 rounded">
                            {step.output || "(Tidak ada output)"}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* 3. Analisis / Jawaban Mahasiswa */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 text-sm">
                      <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">
                        {needsCode ? "Analisis / Penjelasan Mahasiswa:" : "Hasil Analisis & Jawaban Mahasiswa:"}
                      </p>
                      <div className="bg-white p-3 border border-gray-100 rounded-lg">
                        <RichTextViewer content={step.analysis ?? emptyDoc} role="MAHASISWA" mode="viewer-default" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isStudent && (
            <div className="border-t border-gray-100 pt-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-white px-2.5 py-0.5 text-[10px] font-bold text-purple-700 shadow-2xs">
                      <Sparkles size={11} />
                      Rekomendasi AI
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-purple-600">
                    Bobot bagian: {rubric || 0}. Rentang nilai: 0-{rubric || 0}. (Read-Only)
                  </p>

                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Nilai Bagian
                    <input
                      type="text"
                      readOnly
                      value={aiRecommendation?.score != null ? String(aiRecommendation.score) : ""}
                      placeholder="-"
                      className="mt-1 h-9 w-full rounded-lg border border-purple-200 bg-white px-3 text-sm font-semibold text-purple-950 outline-none cursor-default"
                    />
                  </label>

                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Feedback Bagian
                    <textarea
                      readOnly
                      rows={4}
                      value={aiRecommendation?.feedback || ""}
                      placeholder="Rekomendasi AI belum tersedia untuk bagian ini."
                      className="mt-1 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs text-purple-950 outline-none resize-none cursor-default"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                    Form Evaluasi Dosen
                  </h4>
                  <p className="mt-1 text-[11px] font-semibold text-gray-500">
                    Bobot bagian: {rubric || 0}. Rentang nilai: 0-{rubric || 0}.
                  </p>

                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Nilai Bagian
                    {readOnly ? (
                      <span className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800">
                        {evaluation?.score || "-"} / {rubric || 0}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max={rubric || 0}
                        step="0.01"
                        value={evaluation?.score ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value
                          if (raw === "") {
                            onEvaluationChange?.({ score: "", feedback: evaluation?.feedback ?? "" })
                            return
                          }
                          const numeric = Math.min(Math.max(Number(raw), 0), rubric || 0)
                          onEvaluationChange?.({ score: String(numeric), feedback: evaluation?.feedback ?? "" })
                        }}
                        onBlur={() => onAutoSave?.()}
                        className="mt-1 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-semibold outline-none focus:border-blue-500"
                      />
                    )}
                  </label>

                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Feedback Bagian
                    {readOnly ? (
                      <p className="mt-1 min-h-20 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                        {evaluation?.feedback || "Belum ada feedback bagian."}
                      </p>
                    ) : (
                      <textarea
                        value={evaluation?.feedback ?? ""}
                        onChange={(event) => onEvaluationChange?.({ score: evaluation?.score ?? "", feedback: event.target.value })}
                        onBlur={() => onAutoSave?.()}
                        rows={4}
                        placeholder="Feedback final Dosen untuk bagian ini..."
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Experiment Feedback Section */}
          {isStudent && (
            <div className="border-t border-gray-100 pt-5 space-y-4 font-sans">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-sm">
                  {type === "exercise" ? "Feedback & Evaluasi Latihan" : "Feedback & Evaluasi Percobaan"}
                </h4>
                {!readOnly && onOpenFeedbackEditor && (
                  <button
                    onClick={() => onOpenFeedbackEditor(experiment.id)}
                    className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold py-1.5 px-3 rounded-lg border border-blue-100 transition"
                  >
                    {type === "exercise" ? "Beri Feedback Latihan" : "Beri Feedback Percobaan"}
                  </button>
                )}
              </div>

              {/* Section evaluation score / feedback if present */}
              {evaluation && (evaluation.feedback || evaluation.score) && (
                <div className="p-4 border border-blue-200/80 bg-blue-50/50 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} className="text-blue-700" />
                      Evaluasi Dosen Bagian Ini
                    </span>
                    {evaluation.score && (
                      <span className="text-xs font-bold text-blue-800 bg-white px-3 py-1 rounded-md border border-blue-200 shadow-2xs">
                        Nilai Bagian: {evaluation.score} {rubric > 0 ? `/ ${rubric}` : ""}
                      </span>
                    )}
                  </div>
                  {evaluation.feedback && (
                    <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-line font-medium pt-1">
                      {evaluation.feedback}
                    </div>
                  )}
                </div>
              )}

              {visibleFeedbacks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
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
                      <div className="flex items-center justify-between mb-2">
                        {renderSourceBadge(fb.source)}
                        {fb.status === "draft" && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            DRAFT
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {fb.content}
                      </p>

                      {/* Strengths / Issues / Suggestions lists */}
                      <div className="grid gap-2 text-xs mt-2 border-t border-gray-100/50 pt-2">
                        {fb.strengths && fb.strengths.length > 0 && (
                          <div>
                            <span className="font-bold text-green-700">Kelebihan:</span>
                            <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                              {fb.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fb.issues && fb.issues.length > 0 && (
                          <div>
                            <span className="font-bold text-red-700">Kekurangan:</span>
                            <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
                              {fb.issues.map((iss, i) => (
                                <li key={i}>{iss}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fb.suggestions && fb.suggestions.length > 0 && (
                          <div>
                            <span className="font-bold text-blue-700">Saran:</span>
                            <ul className="list-disc pl-4 mt-0.5 text-gray-600 space-y-0.5">
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
              ) : (
                readOnly && !evaluation?.feedback && (
                  <p className="text-xs text-gray-400 italic">Belum ada feedback khusus untuk {type === "exercise" ? "latihan" : "percobaan"} ini.</p>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
