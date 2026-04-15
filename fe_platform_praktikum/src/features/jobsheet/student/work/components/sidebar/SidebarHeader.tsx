import { ChevronRight } from "lucide-react"

interface SidebarHeaderProps {
  progress: number
  collapsed: boolean
  onToggle: () => void
}

export default function SidebarHeader({
  progress,
  onToggle
}: SidebarHeaderProps) {

  return (
    <div className="p-5 border-b border-gray-200">

      <div className="flex items-center gap-3">

        <button
          onClick={onToggle}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center transition"
        >
          <ChevronRight size={20} />
        </button>

        <h3 className="text-gray-800 font-semibold">
          Daftar Modul
        </h3>

      </div>

      <div className="mt-4">
        <div className="h-1 bg-gray-200 rounded-full">
          <div
            className="h-1 bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs mt-2 text-gray-500">
          {progress}% Selesai
        </p>
      </div>

    </div>
  )
}