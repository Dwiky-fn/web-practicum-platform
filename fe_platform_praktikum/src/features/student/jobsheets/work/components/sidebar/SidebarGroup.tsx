import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useLocation } from "react-router-dom"
import type { SidebarNode } from "../../utils/buildSidebarStructure"
import SidebarItem from "./SidebarItem"

interface SidebarGroupProps {
  group: SidebarNode
  getStatus: (path?: string) => "default" | "active" | "completed" | "active-completed" | "locked"
  collapsed: boolean
  onBeforeNavigate?: () => boolean
}

export default function SidebarGroup({
  group,
  getStatus,
  collapsed,
  onBeforeNavigate
}: SidebarGroupProps) {

  const location = useLocation()

  const hasActiveChild = group.children?.some(child =>
    location.pathname.startsWith((child.path ?? "").split("?")[0])
  )

  const [manuallyOpen, setManuallyOpen] = useState(false)
  const open = hasActiveChild || manuallyOpen

  const total = group.children?.length ?? 0
  const completed = group.children?.filter(
    child => {
      const status = getStatus(child.path)

      return status === "completed" || status === "active-completed"
    }
  ).length ?? 0

  return (
    <div>

      {/* GROUP HEADER */}
      {!collapsed && (
        <button
          onClick={() => setManuallyOpen(!open)}
          className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-black transition"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {group.title}
          </div>

          {group.id !== "intro" && (
            <span className="text-xs text-gray-400">
              {completed}/{total}
            </span>
          )}
        </button>
      )}

      {/* CHILDREN */}
      {open && (
        <div className={`relative mt-3 ${collapsed ? "pl-0" : "pl-6"}`}>

          {!collapsed && (
            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200"></div>
          )}

          <div className="space-y-3">
            {group.children?.map(child => (
              <SidebarItem
                key={child.id}
                item={child}
                status={getStatus(child.path)}
                collapsed={collapsed}
                onBeforeNavigate={onBeforeNavigate}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
