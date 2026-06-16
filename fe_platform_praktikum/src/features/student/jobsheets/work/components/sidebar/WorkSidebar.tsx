import { useLocation } from "react-router-dom"
import { buildSidebarTree } from "../../utils/buildSidebarStructure"
import { useState } from "react"
import { Menu } from "lucide-react"
import type { Jobsheet } from "../../../../../../services/jobsheet/types"
import type { StudentProgressItem } from "../../../../../../services/progress/types"
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import type { AcademicScope } from "../../../../../../services/academicScope"
import SidebarGroup from "./SidebarGroup"
import SidebarHeader from "./SidebarHeader"

interface WorkSidebarProps {
  courseId: string
  jobsheet: Jobsheet
  submission: JobsheetSubmission
  savedProgress: number
  completedItems: StudentProgressItem[]
  scope?: AcademicScope
}

export default function WorkSidebar({
  courseId,
  jobsheet,
  submission,
  savedProgress,
  completedItems,
  scope,
}: WorkSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const location = useLocation()
  const groups = buildSidebarTree(courseId, jobsheet, submission, location.search, scope)
  const flatItems = groups.flatMap(g => g.children ?? [])
  const isFinishedSubmission =
    savedProgress >= 100 ||
    submission.status === "SUBMITTED" ||
    submission.status === "REVIEWING" ||
    submission.status === "ACCEPTED"

  const isCompleted = (itemId?: string, itemType?: string) =>
    isFinishedSubmission ||
    (!!itemId &&
    !!itemType &&
    completedItems.some((completed) => completed.type === itemType && completed.id === itemId))

  const isUnlocked = (itemIndex: number) => {
    if (isFinishedSubmission) return true
    if (itemIndex <= 0) return true

    const previousItem = flatItems[itemIndex - 1]

    return isCompleted(previousItem.id, previousItem.type)
  }

  const getStatus = (path?: string): "default" | "active" | "completed" | "active-completed" | "locked" => {
    if (!path) return "default"
    const item = flatItems.find(i => i.path === path)
    const itemIndex = flatItems.findIndex(i => i.path === path)
    const active = !!item?.path && location.pathname.startsWith(item.path.split("?")[0])
    const completed = isCompleted(item?.id, item?.type)

    if (isFinishedSubmission) {
      return "completed"
    }

    if (active && completed) return "active-completed"
    if (active) return "active"
    if (completed) {
      return "completed"
    }
    if (!isUnlocked(itemIndex)) return "locked"

    return "default"
  }

  const handleCollapse = () => {
    setSidebarOpen(false)
  }

  const handleExpand = () => {
    setSidebarOpen(true)
  }

  let progress = 0

  if (isFinishedSubmission) {
    progress = 100
  } else {
    progress = Math.min(Math.max(savedProgress, 0), 100)
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
