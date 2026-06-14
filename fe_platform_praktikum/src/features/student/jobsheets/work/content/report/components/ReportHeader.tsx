import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface ReportHeaderProps {
  title: string
  backTo: string
  rightContent?: React.ReactNode
}

export default function ReportHeader({
  title,
  backTo,
  rightContent,
}: ReportHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">

      {/* LEFT */}
<button
  type="button"
  onClick={() => navigate(backTo)}
  aria-label="Kembali"
  title="Kembali"
  className="flex items-center p-2 rounded hover:bg-gray-100 transition"
>
  <ArrowLeft size={20} className="shrink-0" />
</button>
<span className="text-lg font-semibold text-gray-800 ml-2">{title}</span>

      {/* RIGHT (optional) */}
      {rightContent && (
        <div>
          {rightContent}
        </div>
      )}

    </header>
  )
}