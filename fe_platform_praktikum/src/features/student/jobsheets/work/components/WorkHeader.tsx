import { ArrowLeft } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Course } from "../../../../../services/course/types"
import type { Jobsheet } from "../../../../../services/jobsheet/types"
import type { AcademicScope } from "../../../../../services/academicScope"
import { buildWorkNavigation } from "../utils/buildNavigation"

interface WorkHeaderProps {
  title: string
  backTo: string
  course?: Course | null
  jobsheet?: Jobsheet | null
  scope?: AcademicScope
}

export default function WorkHeader({ title, backTo, course, jobsheet, scope }: WorkHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = course && jobsheet ? buildWorkNavigation(course.id, jobsheet, location.search, scope) : []
  const activeItem = navItems.find((item) => location.pathname.startsWith(item.path))
  const activeTitle = activeItem?.label || title

  return (
    <header className="shrink-0 border-b bg-white px-4 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
<button
  type="button"
  onClick={() => navigate(backTo)}
  aria-label="Kembali"
  title="Kembali"
  className="flex h-8 shrink-0 items-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
>
  <ArrowLeft size={17} className="shrink-0" />
</button>

        <h1 className="min-w-0 truncate text-base font-semibold text-gray-900">
          {activeTitle}
        </h1>
      </div>
    </header>
  )
}
