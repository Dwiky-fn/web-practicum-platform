import { Link, useLocation } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const location = useLocation()

  let listItems: BreadcrumbItem[] = []

  if (items && items.length > 0) {
    listItems = items
  } else {
    // Auto-generate basic breadcrumbs based on URL pathname
    const pathSegments = location.pathname.split("/").filter(Boolean)
    let currentPath = ""
    listItems = pathSegments.map((segment, index) => {
      currentPath += `/${segment}`
      let label = segment.replace(/-/g, " ")
      label = label.charAt(0).toUpperCase() + label.slice(1)
      if (segment === "admin") label = "Admin"
      if (segment === "mata-kuliah") label = "Mata Kuliah"
      if (segment === "dashboard") label = "Dashboard"
      if (segment === "jobsheets") label = "Jobsheet"
      if (segment === "works" || segment === "work") label = "Workspace"
      if (segment === "users") label = "Kelola User"
      if (segment === "academic") label = "Data Akademik"
      if (segment === "departments") label = "Jurusan & Prodi"

      const isLast = index === pathSegments.length - 1
      return {
        label,
        to: isLast ? undefined : currentPath,
      }
    })
  }

  if (listItems.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-gray-500 py-2.5 px-1 ${className}`}>
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2 flex-wrap">
        <li className="inline-flex items-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Home size={14} className="mr-1" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {listItems.map((item, index) => {
          const isLast = index === listItems.length - 1
          return (
            <li key={index} className="inline-flex items-center gap-1.5 md:gap-2">
              <ChevronRight size={12} className="text-gray-400 shrink-0" />
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-gray-600 hover:text-blue-600 transition-colors truncate max-w-[160px] md:max-w-[240px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900 truncate max-w-[200px] md:max-w-[320px]">
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
