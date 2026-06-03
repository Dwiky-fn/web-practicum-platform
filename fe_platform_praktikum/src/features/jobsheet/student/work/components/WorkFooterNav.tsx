import { useLocation, useNavigate } from "react-router-dom";
import { buildWorkNavigation } from "../utils/buildNavigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import type { Jobsheet } from "../../../../../services/jobsheet/types";
import type { StudentProgressItem } from "../../../../../services/progress/types";
import type { JobsheetSubmission } from "../../../../../services/submission/types";

interface WorkFooterNavProps {
  courseId: string,
  jobsheet: Jobsheet,
  submission: JobsheetSubmission
  completedItems: StudentProgressItem[]
}

export default function WorkFooterNav({
  courseId,
  jobsheet,
  submission,
  completedItems
}: WorkFooterNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = buildWorkNavigation(courseId, jobsheet)

  const currentIndex = navItems.findIndex(
    (item) => location.pathname.startsWith(item.path)
  )

  if (currentIndex < 0) {
    return null
  }
  
  const prevItem = navItems[currentIndex - 1]
  const nextItem = navItems[currentIndex + 1]
  const currentItem = navItems[currentIndex]
  
  const isAccepted = submission.status === "ACCEPTED"
  const isLastItem = currentIndex === navItems.length - 1
  const currentCompleted = completedItems.some(
    (item) => item.type === currentItem.type && item.id === currentItem.id
  )
  const canGoNext = isAccepted || currentCompleted

  return (
    <>
      <footer className="hidden md:flex h-16 shrink-0 bg-white border-t items-center justify-between px-8">
        {/* Prev */}
        <div className="w-1/3">
          {prevItem && (
            <button
            onClick={() => navigate(prevItem.path)}
            className="flex items-center text-gray-600 gap-3 p-2 rounded hover:bg-gray-200 hover:text-black active:text-black transition cursor-pointer"
            >
              <ArrowLeft size={18} />
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
            onClick={() => navigate(nextItem.path)}
            className={`flex items-center gap-3 p-2 rounded transition text-right ${
              canGoNext
                ? "text-gray-600 hover:bg-gray-200 hover:text-black active:text-black cursor-pointer"
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <div className="font-semibold truncate">
              {nextItem.label}
            </div>
            <ArrowRight size={18} />
          </button>
        )}

        {!nextItem && isAccepted && isLastItem && (
          <button
            onClick={() =>
              navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}`)
            }
            className="flex items-center text-gray-600 gap-3 p-2 rounded hover:bg-gray-200 hover:text-black active:text-black transition text-right cursor-pointer"
          >
            <Home size={18} />
            <div className="font-semibold text-gray-700 truncate">
              Kembali ke Detail Jobsheet
            </div>
          </button>
        )}
      </div>
      </footer>

      {/* MOBILE FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t z-9999 h-14 flex items-center justify-between px-4">

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
            onClick={() => navigate(nextItem.path)}
            className={`flex flex-col items-center text-xs ${
              canGoNext ? "text-gray-600" : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <ArrowRight size={18} />
          </button>
        ) : isAccepted && isLastItem ? (
          <button
            onClick={() =>
              navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}`)
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
