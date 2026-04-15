import { Bell } from "lucide-react"
import type { Notification } from "../../entities/notification/types"

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
  open: boolean
  onToggle: () => void
  onMarkAll: () => void
}

export default function NotificationBell({
  notifications,
  unreadCount,
  open,
  onToggle,
  onMarkAll,
}: NotificationBellProps) {
  return (
    <div className="relative hidden md:block">
      <button
        className="relative cursor-pointer"
        onClick={onToggle}
      >
        <Bell size={25} className="text-white hover:text-gray-400 active:text-gray-400 translate-y-0.75" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      <div
        className={`
          absolute top-full mt-3 right-0 w-80 bg-white rounded-2xl shadow-2xl z-50
          transition-all duration-200 ease-out origin-top-right
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="font-semibold">Notifikasi</p>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAll}
              className="text-sm text-blue-600 hover:text-blue-800 active:text-blue-800 transition cursor-pointer"
            >
              Tandai sudah dibaca
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada notifikasi.</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg ${
                  notif.isRead ? "bg-gray-100" : "bg-blue-100"
                }`}
              >
                <p className="text-sm font-medium">{notif.title}</p>
                <p className="text-xs text-gray-600">{notif.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
