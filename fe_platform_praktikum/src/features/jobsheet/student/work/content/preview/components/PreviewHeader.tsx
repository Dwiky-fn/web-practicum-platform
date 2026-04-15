import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface PreviewHeaderProps {
  title: string
  backTo: string
  rightContent?: React.ReactNode
}

export default function PreviewHeader({
  title,
  backTo,
  rightContent,
}: PreviewHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">

      {/* LEFT */}
      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition"
      >
        <ArrowLeft size={20} className="shrink-0" />
        <span className="text-lg font-semibold text-gray-800">
          {title}
        </span>
      </button>

      {/* RIGHT (optional) */}
      {rightContent && (
        <div>
          {rightContent}
        </div>
      )}

    </header>
  )
}