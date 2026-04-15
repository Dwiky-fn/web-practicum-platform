import { X } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
  logo: string
  unreadCount: number
}

export default function MobileSidebar({
  open,
  onClose,
  logo,
  unreadCount,
}: MobileSidebarProps) {

  const navigate = useNavigate()

  const goTo = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <div
      className={`
        fixed top-0 left-0 h-full w-72 bg-white shadow-2xl
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        z-60
      `}
    >
      <div className="relative p-6 flex flex-col h-full divide-y-2">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-300 active:bg-gray-300 transition"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col items-center text-center mt-4 mb-4">
            <img
              src={logo}
              alt="Logo"
              className="w-14 h-14 rounded-lg object-cover mb-2"
            />
            <p className="font-semibold text-sm">
              Platform Praktikum
            </p>
            <p className="text-xs text-gray-500">
              Teknik Informatika
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="flex flex-col gap-4 flex-1 pt-6">

          <button
            onClick={() => goTo("/dashboard")}
            className="text-left hover:text-blue-600 active:text-blue-600"
          >
            Dashboard
          </button>

          <button
            onClick={() => goTo("/courses")}
            className="text-left hover:text-blue-600 active:text-blue-600"
          >
            Mata Kuliah
          </button>

          <button
            onClick={() => goTo("/notifications")}
            className="flex items-center justify-between text-left hover:text-blue-600 active:text-blue-600"
          >
            <span>Notifikasi</span>

            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => goTo("/settings")}
            className="text-left hover:text-blue-600 active:text-blue-600"
          >
            Pengaturan
          </button>

        </div>

        {/* Footer */}
        <button
          onClick={() => goTo("/")}
          className="text-left text-red-500 hover:text-red-900 active:text-red-900 pt-6"
        >
          Keluar
        </button>

      </div>
    </div>
  )
}
