import { useLocation, useNavigate } from "react-router-dom";
import { buildWorkNavigation } from "../utils/buildNavigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { academicJobsheetPath, type AcademicScope } from "../../../../../services/academicScope";
import type { Jobsheet } from "../../../../../services/jobsheet/types";
import type { StudentProgressItem } from "../../../../../services/progress/types";
import type { JobsheetSubmission } from "../../../../../services/submission/types";

interface WorkFooterNavProps {
  courseId: string,
  jobsheet: Jobsheet,
  submission: JobsheetSubmission
  savedProgress: number
  completedItems: StudentProgressItem[]
  scope?: AcademicScope
  basePath?: string
  backTo?: string
}

export default function WorkFooterNav({
  courseId,
  jobsheet,
  submission,
  savedProgress,
  completedItems,
  scope,
  basePath,
  backTo,
}: WorkFooterNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const query = location.search

  const navItems = buildWorkNavigation(courseId, jobsheet, query, scope, basePath)
  const jobsheetDetailPath = academicJobsheetPath(courseId, jobsheet.id, scope)
  const returnPath = backTo ?? jobsheetDetailPath

  const currentIndex = navItems.findIndex(
    (item) => location.pathname.startsWith(item.path.split("?")[0])
  )

  if (currentIndex < 0) {
    return null
  }
  
  const prevItem = navItems[currentIndex - 1]
  const nextItem = navItems[currentIndex + 1]
  const currentItem = navItems[currentIndex]
  
  const isFinishedSubmission =
    savedProgress >= 100 ||
    submission.status === "SUBMITTED" ||
    submission.status === "REVIEWING" ||
    submission.status === "ACCEPTED"
  const hasUploadedSubmission =
    submission.status === "SUBMITTED" ||
    submission.status === "REVIEWING" ||
    submission.status === "REVISION" ||
    submission.status === "ACCEPTED"
  const isLastItem = currentIndex === navItems.length - 1
  const currentCompleted = completedItems.some(
    (item) => item.type === currentItem.type && item.id === currentItem.id
  )
  const isTheoryItem = currentItem.type === "theory"
  const canGoNext = isFinishedSubmission || !isTheoryItem || currentCompleted

  const getIncompletePracticeMessage = (): string | null => {
    const isExperiment = location.pathname.includes("/experiment/")
    const isExercise = location.pathname.includes("/exercise/")
    if (!isExperiment && !isExercise) return null

    const parts = location.pathname.split("?")[0].split("/")
    const targetId = isExperiment ? parts[parts.indexOf("experiment") + 1] : parts[parts.indexOf("exercise") + 1]
    if (!targetId) return null

    const reportData = isExperiment
      ? submission?.report?.experiments?.[targetId]
      : submission?.report?.exercises?.[targetId]

    const steps = reportData?.steps || []
    if (!steps.length) {
      return "Anda belum mengisi kode program, membuat output kode program, dan menulis analisis pengerjaan."
    }

    const missingParts: string[] = []
    const hasCode = steps.some((s) => Object.values(s.files || {}).some((c) => Boolean(c && c.trim())))
    const hasOutput = steps.some((s) => Boolean(s.output && s.output.trim()))
    const hasAnalysis = steps.some((s) => {
      if (!s.analysis) return false
      if (typeof s.analysis === "string") return Boolean(s.analysis.trim())
      const jsonStr = JSON.stringify(s.analysis)
      return jsonStr.length > 25 && !jsonStr.includes('"text":""')
    })

    if (!hasCode) missingParts.push("kode program")
    if (!hasOutput) missingParts.push("output kode program")
    if (!hasAnalysis) missingParts.push("analisis pengerjaan")

    if (missingParts.length > 0) {
      return `Perhatian: Anda belum melengkapi ${missingParts.join(", ")} pada bagian ini.`
    }

    return null
  }

  const handleNextClick = (targetPath: string) => {
    const warning = getIncompletePracticeMessage()
    if (warning) {
      const confirmNext = window.confirm(`${warning}\n\nApakah Anda yakin ingin tetap melanjutkan ke halaman berikutnya?`)
      if (!confirmNext) return
    }
    navigate(targetPath)
  }

  return (
    <>
      <footer className="hidden h-12 shrink-0 items-center justify-between border-t bg-white px-6 md:flex">
        {/* Prev */}
        <div className="w-1/3">
          {prevItem && (
            <button
            onClick={() => navigate(prevItem.path)}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-black"
            >
              <ArrowLeft size={16} />
              <div className="font-semibold text-gray-700 truncate">
                  {prevItem.label}
              </div>
            </button>
          )}
        </div>

        {/* Current Materi */}
        <div className="w-1/3 text-center">
          <div className="font-semibold text-gray-700 truncate">
              {currentItem.label}
          </div>
        </div>

        {/* Next */}
        <div className="w-1/3 flex justify-end">
        {nextItem && (
          <button
            disabled={!canGoNext}
            onClick={() => handleNextClick(nextItem.path)}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-right text-sm transition ${
              canGoNext
                ? "text-gray-600 hover:bg-gray-200 hover:text-black active:text-black cursor-pointer"
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <div className="font-semibold truncate">
              {nextItem.label}
            </div>
            <ArrowRight size={16} />
          </button>
        )}

        {!nextItem && hasUploadedSubmission && isLastItem && (
          <button
            onClick={() =>
              navigate(returnPath)
            }
            className="flex items-center gap-2 rounded px-2 py-1.5 text-right text-sm text-gray-600 transition hover:bg-gray-100 hover:text-black"
          >
            <Home size={18} />
            <div className="font-semibold text-gray-700 truncate">
              Kembali ke Monitoring
            </div>
          </button>
        )}
      </div>
      </footer>

      {/* MOBILE FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 z-9999 flex h-12 items-center justify-between border-t bg-white px-4 md:hidden">

        {/* Prev */}
        {prevItem ? (
          <button
          onClick={() => navigate(prevItem.path)}
            className="flex flex-col items-center text-xs text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div />
        )}

        {/* Current */}
        <div className="text-xs font-semibold text-center truncate max-w-30">
          {currentItem.label}
        </div>

        {/* Next */}
        {nextItem ? (
          <button
            disabled={!canGoNext}
            onClick={() => handleNextClick(nextItem.path)}
            className={`flex flex-col items-center text-xs ${
              canGoNext ? "text-gray-600" : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <ArrowRight size={18} />
          </button>
        ) : hasUploadedSubmission && isLastItem ? (
          <button
            onClick={() =>
              navigate(returnPath)
            }
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg"
          >
            Detail
          </button>
        ) : (
          <div />
        )}
      </footer>
    </>
  )
}
