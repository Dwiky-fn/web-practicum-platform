import { useLocation, useNavigate } from "react-router-dom";
import { buildWorkNavigation } from "../utils/buildNavigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import type { Jobsheet } from "../../../../../entities/jobsheet/types";

interface WorkFooterNavProps {
  courseId: string,
  jobsheet: Jobsheet
}

export default function WorkFooterNav({
  courseId,
  jobsheet
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
  
  const isAccepted = jobsheet.status === "ACCEPTED"
  const isLastItem = currentIndex === navItems.length - 1

  return (
    <>
      <footer className="hidden md:flex h-16 shrink-0 bg-white border-t items-center justify-between px-8">
        {/* Prev */}
        <div className="w-1/3">
          {prevItem && (
            <button
            onClick={() => navigate(prevItem.path)}
            className="flex items-center gap-2 text-gray-600 hover:text-black active:text-black transition"
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
            onClick={() => navigate(nextItem.path)}
            className="flex items-center gap-2 text-gray-600 hover:text-black active:text-black transition text-right"
          >
            <div className="font-semibold text-gray-700 truncate">
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
            className="flex items-center gap-2 text-gray-600 hover:text-black active:text-black transition text-right"
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
            onClick={() => navigate(nextItem.path)}
            className="flex flex-col items-center text-xs text-gray-600"
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