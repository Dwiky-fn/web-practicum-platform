import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, MessageSquare, AlertCircle, Sparkles, User, FileEdit } from "lucide-react"
import RichTextViewer from "../../../../components/editor/RichTextViewer"
import CodeReviewBlock from "./CodeReviewBlock"
import type { SelectedLineRange } from "./CodeReviewBlock"
import type { ReviewFeedback } from "../../../../services/reviewFeedbackService"

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
}: Props) {
  const [isExpanded, setIsExpanded] = useState(isExpandedByDefault)

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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
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
        <div className="p-5 space-y-6">
          {/* Instructions */}
          {experiment.instructionContent && (
            <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-4 text-sm">
              <h4 className="font-semibold text-blue-900 mb-2 text-xs uppercase tracking-wide">
                Instruksi Kerja
              </h4>
              <RichTextViewer content={experiment.instructionContent} role="MAHASISWA" mode="viewer-default" />
            </div>
          )}

          {/* Steps */}
          {!steps.length ? (
            <div className="flex items-center gap-2 text-gray-400 italic text-sm py-4">
              <AlertCircle size={16} />
              <span>Mahasiswa belum mengisi laporan untuk {type === "exercise" ? "latihan" : "percobaan"} ini.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {steps.map((step, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-4">
                  {type !== "exercise" && steps.length > 1 && (
                    <h4 className="font-semibold text-gray-800 text-sm">
                      Langkah Ke-{idx + 1}
                    </h4>
                  )}

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
                      {step.output || "-"}
                    </pre>
                  </div>

                  {/* Analysis */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-700 mb-2">Analisis Mahasiswa:</p>
                    <div className="bg-white p-3 border border-gray-100 rounded">
                      <RichTextViewer content={step.analysis ?? emptyDoc} role="MAHASISWA" mode="viewer-default" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Experiment Feedback Section */}
          {isStudent && (visibleFeedbacks.length > 0 || (!readOnly && onOpenFeedbackEditor)) && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-800 text-sm">
                  {type === "exercise" ? "Feedback Latihan" : "Feedback Percobaan"}
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
                readOnly && (
                  <p className="text-xs text-gray-400 italic">Belum ada feedback untuk percobaan ini.</p>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
