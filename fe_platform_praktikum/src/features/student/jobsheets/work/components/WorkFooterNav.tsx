import { useLocation, useNavigate } from "react-router-dom";
import { buildWorkNavigation } from "../utils/buildNavigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { academicJobsheetPath, type AcademicScope } from "../../../../../services/academicScope";
import type { Jobsheet } from "../../../../../services/jobsheet/types";
import type { StudentProgressItem } from "../../../../../services/progress/types";
import type { JobsheetSubmission } from "../../../../../services/submission/types";
import { getIncompletePracticeMessage } from "../utils/checkPracticeCompletion";
import { toast } from "../../../../../components/toast/toastStore";

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

  const isTheory = location.pathname.includes("/theory/")
  let isTheoryIncomplete = false
  if (isTheory) {
    const parts = location.pathname.split("?")[0].split("/")
    const theoryId = parts[parts.indexOf("theory") + 1]
    const completed = completedItems.some(item => item.type === "theory" && item.id === theoryId)
    if (!completed && !isFinishedSubmission) {
      isTheoryIncomplete = true
    }
  }

  const hasPracticeWarning = Boolean(getIncompletePracticeMessage(location.pathname, jobsheet, submission)) && !isFinishedSubmission
  const isVisuallyDisabled = isTheoryIncomplete || hasPracticeWarning




  const handleNextClick = (targetPath: string) => {
    const isTheory = location.pathname.includes("/theory/")
    if (isTheory) {
      const parts = location.pathname.split("?")[0].split("/")
      const theoryId = parts[parts.indexOf("theory") + 1]
      const completed = completedItems.some(item => item.type === "theory" && item.id === theoryId)
      if (!completed && !isFinishedSubmission) {
        toast.error("Harap selesaikan membaca materi dasar teori terlebih dahulu.")
        return
      }
    }

    const warning = getIncompletePracticeMessage(location.pathname, jobsheet, submission)
    if (warning && !isFinishedSubmission) {
      toast.error(warning)
      return
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
            onClick={() => handleNextClick(nextItem.path)}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-right text-sm transition ${
              isVisuallyDisabled
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-200 hover:text-black active:text-black cursor-pointer"
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
              {location.pathname.startsWith("/lecturer") ? "Kembali" : "Kembali ke Detail Jobsheet"}
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
            onClick={() => handleNextClick(nextItem.path)}
            className={`flex flex-col items-center text-xs ${
              isVisuallyDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-600"
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
            {location.pathname.startsWith("/lecturer") ? "Kembali" : "Detail Jobsheet"}
          </button>
        ) : (
          <div />
        )}
      </footer>
    </>
  )
}
