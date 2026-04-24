import { useLocation } from "react-router-dom"
import { buildSidebarTree } from "../../utils/buildSidebarStructure"
import { useState } from "react"
import { Menu } from "lucide-react"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../entities/jobsheetSubmission/types"
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
  const [buttonVisible, setButtonVisible] = useState(false)

  const location = useLocation()
  const groups = buildSidebarTree(courseId, jobsheet)
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

    setTimeout(() => {
      setButtonVisible(true)
    }, 300)
  }

  const handleExpand = () => {
    setButtonVisible(false)

    setTimeout(() => {
      setSidebarOpen(true)
    }, 300)
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
      <button
        onClick={handleExpand}
        className={`
          hidden lg:flex
          absolute top-1/10 right-0 -translate-y-1/2
          w-12 h-12 bg-blue-600 text-white rounded-l-full
          items-center justify-center shadow-lg
          transition-all duration-300 ease-in-out z-40 cursor-pointer
          ${
            buttonVisible
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 pointer-events-none"
          }
        `}
      >
        <Menu size={20} />
      </button>

      {/* SIDEBAR */}
      <aside
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={`
          hidden lg:flex flex-col
          bg-white border-l border-gray-200
          transition-[width] duration-300 ease-in-out
          ${sidebarOpen ? "w-80" : "w-0"}
        `}
      >
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
      </aside>
    </>
  )
}
