import { Bell, BellOff, CheckCheck, Sparkles, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Notification } from "../../services/notification/types"

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
  open: boolean
  onToggle: () => void
  onMarkAll: () => void
  onMarkItemRead?: (id: string) => void
}

export default function NotificationBell({
  notifications,
  unreadCount,
  open,
  onToggle,
  onMarkAll,
  onMarkItemRead,
}: NotificationBellProps) {
  const navigate = useNavigate()

  // Filter out notifications that have been read for more than 3 minutes
  const displayNotifications = notifications.filter((notif) => {
    if (!notif.isRead) return true
    if (notif.readAtTimestamp) {
      const minutes = (Date.now() - notif.readAtTimestamp) / 1000 / 60
      return minutes < 3
    }
    return false
  })

  const handleNotificationClick = (notif: Notification) => {
    onToggle()
    if (onMarkItemRead) {
      onMarkItemRead(notif.id)
    } else {
      onMarkAll()
    }
    let target = notif.targetUrl || notif.target_url
    if (target) {
      target = target.replace(/\/works\b/g, "").replace(/\/work\b/g, "")
      navigate(target)
    }
  }

  return (
    <div id="notification-bell-container" className="relative hidden md:block">
      <button
        type="button"
        className="relative flex items-center justify-center rounded-xl p-2 text-white transition-all hover:bg-white/10 active:scale-95 focus:outline-none cursor-pointer"
        onClick={onToggle}
        aria-label="Notifikasi"
      >
        <Bell size={22} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-extrabold text-white shadow-md ring-2 ring-blue-800">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <div
        className={`
          absolute right-0 top-full mt-3 w-96 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl z-50
          transition-all duration-200 ease-out origin-top-right
          ${open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
        `}
      >
        {/* Header Notifikasi */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" />
              <span className="font-bold text-sm">Notifikasi Sistem</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="flex items-center gap-1 text-xs font-bold text-blue-200 transition-colors hover:text-white focus:outline-none cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>
        </div>

        {/* List Notifikasi */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {displayNotifications.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <BellOff size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-500">Belum ada notifikasi saat ini.</p>
            </div>
          ) : (
            displayNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group flex flex-col gap-1 rounded-xl p-3.5 border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  notif.isRead
                    ? "bg-white border-gray-200/70 text-gray-600 hover:bg-blue-50/40"
                    : "bg-blue-50/90 border-blue-200 text-gray-900 shadow-sm border-l-4 border-l-blue-600 hover:bg-blue-100/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-900 group-hover:text-blue-700 flex items-center gap-1">
                    {notif.title}
                    {(notif.targetUrl || notif.target_url) && (
                      <ExternalLink size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </p>
                  {!notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{notif.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer Notifikasi */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={() => {
              onToggle()
              navigate("/notifications")
            }}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 transition cursor-pointer"
          >
            Lihat Kumpulan Notifikasi
          </button>
        </div>
      </div>
    </div>
  )
}
