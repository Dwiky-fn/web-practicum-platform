import { useLocation } from "react-router-dom"
import type { Course } from "../../../../../services/course/types"
import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { AcademicScope } from "../../../../../services/academicScope"
import { buildWorkNavigation } from "../utils/buildNavigation"
import Breadcrumbs from "../../../../../components/Breadcrumbs"
import BackButton from "../../../../../components/BackButton"

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
}: WorkHeaderProps) {
  const location = useLocation()
  const navItems = course && jobsheet ? buildWorkNavigation(course.id, jobsheet, location.search, scope, basePath) : []
  const activeItem = navItems.find((item) => location.pathname.startsWith(item.path.split("?")[0]))
  const activeTitle = activeItem?.label || title

  return (
    <header className="shrink-0 border-b bg-white px-4 py-1.5 sm:px-5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <BackButton to={backTo} />
        <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900">
          {activeTitle}
        </h1>
      </div>

      <Breadcrumbs
        items={[
          { label: "Mata Kuliah", to: "/mata-kuliah" },
          { label: course?.name || jobsheet?.title || "Detail Mata Kuliah", to: backTo },
          { label: activeTitle },
        ]}
        className="hidden md:flex py-0 text-[11px]"
      />
    </header>
  )
}
