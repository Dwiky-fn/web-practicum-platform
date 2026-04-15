import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface WorkHeaderProps {
  title: string
  backTo: string
}

export default function WorkHeader({ title, backTo }: WorkHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b flex items-center px-6">
      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-3 p-2 rounded hover:bg-gray-200 transition"
      >
        <ArrowLeft size={20} className="shrink-0" />
        <span className="text-lg font-semibold text-gray-800">
          {title}
        </span>
      </button>
    </header>
  )
}