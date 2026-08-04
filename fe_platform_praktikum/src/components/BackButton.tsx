import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface BackButtonProps {
  to?: string | number
  onClick?: () => void
  label?: string
  className?: string
}

export default function BackButton({ to, onClick, label = "Kembali", className = "" }: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (typeof to === "number") {
      navigate(to)
    } else if (typeof to === "string") {
      navigate(to)
    } else {
      navigate(-1)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 active:scale-97 cursor-pointer shrink-0 ${className}`}
      title={label}
    >
      <ArrowLeft size={15} className="shrink-0 text-gray-500 transition-colors group-hover:text-blue-600" />
      <span>{label}</span>
    </button>
  )
}
