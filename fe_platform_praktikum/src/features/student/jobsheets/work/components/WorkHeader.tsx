import { ArrowLeft, MessageSquare } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Course } from "../../../../../services/course/types"
import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { AcademicScope } from "../../../../../services/academicScope"
import { buildWorkNavigation } from "../utils/buildNavigation"
import Breadcrumbs from "../../../../../components/Breadcrumbs"

interface WorkHeaderProps {
  title: string
  backTo: string
  course?: Course | null
  jobsheet?: Jobsheet | null
  scope?: AcademicScope
  basePath?: string
  onToggleChat?: () => void
  isChatOpen?: boolean
  unreadChatCount?: number
}

export default function WorkHeader({
  title,
  backTo,
  course,
  jobsheet,
  scope,
  basePath,
  onToggleChat,
  isChatOpen,
  unreadChatCount = 0,
}: WorkHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = course && jobsheet ? buildWorkNavigation(course.id, jobsheet, location.search, scope, basePath) : []
  const activeItem = navItems.find((item) => location.pathname.startsWith(item.path.split("?")[0]))
  const activeTitle = activeItem?.label || title

  return (
    <header className="shrink-0 border-b bg-white px-4 py-1.5 sm:px-5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label="Kembali"
          title="Kembali"
          className="flex items-center gap-2 rounded-md py-1 px-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} className="shrink-0 text-gray-500" />
          <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900">
            {activeTitle}
          </h1>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Breadcrumbs
          items={[
            { label: "Mata Kuliah", to: "/mata-kuliah" },
            { label: jobsheet?.title || "Jobsheet", to: backTo },
            { label: activeTitle },
          ]}
          className="hidden md:flex py-0 text-[11px]"
        />

        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              isChatOpen
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
            }`}
            title="Tanya / Diskusi Dosen"
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Diskusi Dosen</span>
            {Boolean(unreadChatCount) && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-xs">
                {unreadChatCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
