import { Check, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { SidebarNode } from "../../utils/buildSidebarStructure"
import { toast } from "../../../../../../components/toast/toastStore"

interface SidebarItemProps {
  item: SidebarNode
  status: "default" | "active" | "completed" | "active-completed" | "locked"
  collapsed: boolean
  onBeforeNavigate?: () => boolean
}

export default function SidebarItem({
  item,
  status,
  collapsed,
  onBeforeNavigate
}: SidebarItemProps) {

  const navigate = useNavigate()

  const renderIndicator = () => {

    if (status === "completed" || status === "active-completed") {
      return (
        <div className="w-4 h-4 border-2 border-blue-600 rounded-full flex items-center justify-center">
          <Check size={10} className="text-blue-600" />
        </div>
      )
    }

    if (status === "active") {
      return (
        <div className="w-4 h-4 border-2 border-blue-600 rounded-full scale-110 transition" />
      )
    }

    if (status === "locked") {
      return <Lock size={14} className="text-gray-300" />
    }

    return (
      <div className="w-2 h-2 bg-gray-400 rounded-full" />
    )
  }

  return (
    <button
      onClick={() => {
        if (onBeforeNavigate) {
          const canNavigate = onBeforeNavigate()
          if (!canNavigate) return
        }
        if (status === "locked") {
          toast.error("Selesaikan modul sebelumnya terlebih dahulu.")
          return
        }
        navigate(item.path!)
      }}
      className={`flex items-center gap-3 text-sm transition w-full ${
        status === "locked"
          ? "cursor-not-allowed text-gray-300"
          : "text-gray-500 hover:text-gray-900"
      }`}
      title={collapsed ? item.title : ""}
    >
      {renderIndicator()}

      {!collapsed && (
        <span className="min-w-0 text-left">
          <span className={
            status === "active" || status === "active-completed" || item.meta?.isLastPosition
              ? "block text-gray-800 font-medium"
              : "block"
          }>
            {item.title}
          </span>
          {item.meta?.isLastPosition && (
            <span className="mt-1 block rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 whitespace-pre-line">
              {item.meta.positionLabel || "Posisi Terakhir"}
            </span>
          )}
        </span>
      )}
    </button>
  )
}
