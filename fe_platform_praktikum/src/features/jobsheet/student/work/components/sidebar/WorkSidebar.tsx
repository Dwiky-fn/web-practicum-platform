import { useLocation } from "react-router-dom"
import { buildSidebarTree } from "../../utils/buildSidebarStructure"
import { useState } from "react"
import { Menu } from "lucide-react"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import SidebarGroup from "./SidebarGroup"
import SidebarHeader from "./SidebarHeader"

interface WorkSidebarProps {
  courseId: string
  jobsheet: Jobsheet
  submission: JobsheetSubmission
}

export default function WorkSidebar({
  courseId,
  jobsheet,
  submission
}: WorkSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const location = useLocation()
  const groups = buildSidebarTree(courseId, jobsheet, submission)
  const flatItems = groups.flatMap(g => g.children ?? [])

  const currentIndex = flatItems.findIndex(item =>
    location.pathname.startsWith(item.path ?? "")
  )

  const getStatus = (path?: string): "default" | "active" | "completed" => {
    if (!path) return "default"
    const index = flatItems.findIndex(i => i.path === path)

    if (submission.status === "ACCEPTED") {
      return "completed"
    }

    if (index < currentIndex) return "completed"
    if (index === currentIndex) return "active"
    return "default"
  }

  const handleCollapse = () => {
    setSidebarOpen(false)
  }

  const handleExpand = () => {
    setSidebarOpen(true)
  }

  // Hitung progres
  const totalItems = flatItems.length

  let progress = 0

  if (submission.status === "ACCEPTED") {
    progress = 100
  } else if (currentIndex >= 0) {
    progress = Math.round(((currentIndex + 1) / totalItems) * 100)
  }

  return (
    <>
      {/* FLOATING BUTTON */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={handleExpand}
          aria-label="Buka daftar modul"
          aria-expanded={sidebarOpen}
          className="
            absolute right-0 top-6 z-40 hidden h-12 w-12
            items-center justify-center rounded-l-full bg-blue-600
            text-white shadow-lg transition hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            lg:flex
          "
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      )}

      {/* SIDEBAR */}
      <aside
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={`
          hidden lg:flex flex-col
          bg-white border-l border-gray-200
          shrink-0 overflow-hidden
          transition-[width] duration-300 ease-in-out
          ${sidebarOpen ? "w-80" : "w-0 border-l-0"}
        `}
      >
        <div className="flex h-full w-80 flex-col">
          <SidebarHeader
            progress={progress}
            collapsed={!sidebarOpen}
            onToggle={handleCollapse}
          />

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {groups.map(group => (
              <SidebarGroup
                key={group.id}
                group={group}
                getStatus={getStatus}
                collapsed={false}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
