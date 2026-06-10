import React, { useState } from "react"
import { MessageSquare, Plus } from "lucide-react"
import type { ReviewFeedback } from "../../../../services/reviewFeedbackService"

export interface SelectedLineRange {
  experimentId: string
  codeBlockId: string
  fileName?: string
  startLine: number
  endLine: number
  selectedCode: string
}

interface Props {
  submissionId: string
  experimentId: string
  codeBlockId: string
  fileName: string
  code: string
  feedbacks: ReviewFeedback[]
  readOnly?: boolean
  activeFeedbackId?: string | null
  onSelectLines?: (range: SelectedLineRange) => void
  onSelectFeedback?: (feedbackId: string) => void
  selectedLineRange?: SelectedLineRange | null
  onClearSelection?: () => void
}

export default function CodeReviewBlock({
  experimentId,
  codeBlockId,
  fileName,
  code,
  feedbacks,
  readOnly = false,
  activeFeedbackId = null,
  onSelectLines,
  onSelectFeedback,
  selectedLineRange,
  onClearSelection,
}: Props) {
  const lines = code.split("\n")
  const [dragStart, setDragStart] = useState<number | null>(null)

  // Filter feedbacks belonging to this specific file and code block
  const fileFeedbacks = feedbacks.filter(
    (f) =>
      f.experimentId === experimentId &&
      f.fileName === fileName &&
      f.scope === "code" &&
      (!f.codeBlockId || f.codeBlockId === codeBlockId || f.codeBlockId.includes(experimentId))
  )

  // Check if a line is within the active selection range
  const isLineSelected = (lineIndex: number) => {
    if (!selectedLineRange) return false
    if (
      selectedLineRange.experimentId !== experimentId ||
      selectedLineRange.codeBlockId !== codeBlockId ||
      selectedLineRange.fileName !== fileName
    ) {
      return false
    }
    const lineNum = lineIndex + 1
    const start = Math.min(selectedLineRange.startLine, selectedLineRange.endLine)
    const end = Math.max(selectedLineRange.startLine, selectedLineRange.endLine)
    return lineNum >= start && lineNum <= end
  }

  // Get active feedbacks for a line
  const getLineFeedbacks = (lineNumber: number) => {
    return fileFeedbacks.filter((f) => {
      const start = f.startLine ?? 0
      const end = f.endLine ?? 0
      return lineNumber >= start && lineNumber <= end
    })
  }

  // Check if a feedback is active
  const isFeedbackActive = (feedbackId: string) => {
    return activeFeedbackId === feedbackId
  }

  // Click on line number handler
  const handleLineNumberClick = (e: React.MouseEvent, index: number) => {
    if (readOnly || !onSelectLines) return
    const lineNum = index + 1

    if (e.shiftKey && selectedLineRange && selectedLineRange.codeBlockId === codeBlockId) {
      // Shift+Click range selection
      const start = selectedLineRange.startLine
      const end = lineNum
      const selectedText = lines
        .slice(Math.min(start, end) - 1, Math.max(start, end))
        .join("\n")

      onSelectLines({
        experimentId,
        codeBlockId,
        fileName,
        startLine: start,
        endLine: end,
        selectedCode: selectedText,
      })
    } else {
      // Single line selection
      onSelectLines({
        experimentId,
        codeBlockId,
        fileName,
        startLine: lineNum,
        endLine: lineNum,
        selectedCode: lines[index] || "",
      })
    }
  }

  // Text selection Drag handlers
  const handleMouseDown = (index: number) => {
    if (readOnly) return
    setDragStart(index + 1)
  }

  const handleMouseUp = (index: number) => {
    if (readOnly || !dragStart || !onSelectLines) {
      setDragStart(null)
      return
    }
    const endLine = index + 1
    const start = dragStart
    const end = endLine
    const selectedText = lines
      .slice(Math.min(start, end) - 1, Math.max(start, end))
      .join("\n")

    onSelectLines({
      experimentId,
      codeBlockId,
      fileName,
      startLine: start,
      endLine: end,
      selectedCode: selectedText,
    })
    setDragStart(null)
  }

  const handleMouseEnterLine = (index: number) => {
    if (readOnly || !dragStart || !onSelectLines) return
    // Show live selection preview while dragging
    const endLine = index + 1
    onSelectLines({
      experimentId,
      codeBlockId,
      fileName,
      startLine: dragStart,
      endLine: endLine,
      selectedCode: lines
        .slice(Math.min(dragStart, endLine) - 1, Math.max(dragStart, endLine))
        .join("\n"),
    })
  }

  return (
    <div className="relative rounded-lg border border-gray-200 bg-gray-950 overflow-hidden font-mono text-xs text-gray-100 my-3 select-none">
      {/* File Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 text-gray-400 font-sans text-xs flex justify-between items-center">
        <span>{fileName || "file utama"}</span>
        {!readOnly && selectedLineRange && selectedLineRange.fileName === fileName && (
          <button
            onClick={onClearSelection}
            className="text-gray-500 hover:text-white text-[10px] uppercase font-bold"
          >
            Batal Pilih
          </button>
        )}
      </div>

      <div className="overflow-x-auto py-2">
        {lines.map((line, index) => {
          const lineNum = index + 1
          const lineFbs = getLineFeedbacks(lineNum)
          const isSelected = isLineSelected(index)
          
          // Determine line background styling
          let bgClass = "hover:bg-gray-900/40"
          if (isSelected) {
            bgClass = "bg-blue-900/40 border-l-2 border-blue-500"
          } else if (lineFbs.length > 0) {
            const hasActive = lineFbs.some((f) => isFeedbackActive(f.id))
            bgClass = hasActive
              ? "bg-yellow-900/30 border-l-2 border-yellow-500"
              : "bg-gray-900/30 border-l-2 border-gray-600"
          }

          return (
            <div
              key={index}
              id={`code-line-${experimentId}-${codeBlockId}-${fileName}-${lineNum}`}
              className={`flex items-stretch group relative ${bgClass} transition-colors min-w-full`}
              onMouseDown={() => handleMouseDown(index)}
              onMouseUp={() => handleMouseUp(index)}
              onMouseEnter={() => handleMouseEnterLine(index)}
            >
              {/* Line Gutter (Numbers & Markers) */}
              <div className="flex items-center justify-between w-16 bg-gray-900/50 px-2 py-0.5 text-right text-gray-500 border-r border-gray-800/50 shrink-0 select-none">
                <span
                  onClick={(e) => handleLineNumberClick(e, index)}
                  className="cursor-pointer hover:text-white flex-grow block h-full text-right pr-1"
                  title={readOnly ? undefined : "Klik untuk memilih baris. Shift+klik untuk rentang."}
                >
                  {lineNum}
                </span>

                {/* Comment Indicator */}
                {lineFbs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectFeedback?.(lineFbs[0].id)}
                    className="ml-1 text-yellow-500 hover:text-yellow-300 flex items-center gap-0.5"
                    title={`${lineFbs.length} komentar pada baris ini`}
                  >
                    <MessageSquare size={10} className="fill-current" />
                    {lineFbs.length > 1 && (
                      <span className="text-[8px] font-bold">{lineFbs.length}</span>
                    )}
                  </button>
                )}
              </div>

              {/* Code Line Content */}
              <div className="pl-4 pr-6 py-0.5 whitespace-pre flex-grow select-text">
                {line || " "}
              </div>

              {/* Floating commenter popup inside absolute layout relative to lines */}
              {!readOnly && isSelected && index === Math.max(selectedLineRange!.startLine, selectedLineRange!.endLine) - 1 && onSelectLines && (
                <div className="absolute right-4 bottom-[-16px] z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Prompt parent review panel tab change & open editor
                    }}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2.5 rounded-full shadow-lg text-[10px] font-sans pointer-events-auto"
                  >
                    <Plus size={10} />
                    <span>Tambahkan komentar</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
