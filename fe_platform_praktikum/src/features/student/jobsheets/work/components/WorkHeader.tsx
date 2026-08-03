import { ArrowLeft } from "lucide-react"
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
}

export default function WorkHeader({ title, backTo, course, jobsheet, scope, basePath }: WorkHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = course && jobsheet ? buildWorkNavigation(course.id, jobsheet, location.search, scope, basePath) : []
  const activeItem = navItems.find((item) => location.pathname.startsWith(item.path.split("?")[0]))
  const activeTitle = activeItem?.label || title

  return (
    <header className="shrink-0 border-b bg-white px-4 py-1.5 sm:px-5 flex flex-wrap items-center justify-between gap-2">
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
      <Breadcrumbs
        items={[
          { label: "Mata Kuliah", to: "/mata-kuliah" },
          { label: jobsheet?.title || "Jobsheet", to: backTo },
          { label: activeTitle },
        ]}
        className="py-0 text-[11px]"
      />
    </header>
  )
}
