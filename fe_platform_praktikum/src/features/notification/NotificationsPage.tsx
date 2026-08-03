import { useEffect, useState } from "react"
import { Bell, CheckCheck, ExternalLink, Sparkles, Inbox } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { getNotifications, markNotificationsAsRead } from "../../services/notification/service"
import type { Notification } from "../../services/notification/types"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import Navbar from "../../components/navbar/Navbar"
import AdminLayout from "../admin/components/AdminLayout"
import LecturerLayout from "../lecturer/components/LecturerLayout"
import TopProgressBar from "../../components/loading/TopProgressBar"

export default function NotificationsPage() {
  const { user } = useCurrentUser()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!user) return

    async function loadNotifs() {
      if (!user) return
      setLoading(true)
      try {
        const data = await getNotifications(user.id)
        setNotifications(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Gagal memuat notifikasi:", err)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    loadNotifs()
  }, [user])

  const handleMarkAllRead = async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await markNotificationsAsRead(user.id)
  }

  const handleItemClick = async (notif: Notification) => {
    if (!user) return
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item)),
      )
      await markNotificationsAsRead(user.id, notif.id)
    }

    let target = notif.targetUrl || notif.target_url
    if (target) {
      target = target.replace(/\/works\b/g, "").replace(/\/work\b/g, "")
      navigate(target)
    }
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.isRead
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const pageContent = (
    <div className="space-y-6">
      {/* Hero Banner Panel */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Sparkles size={16} className="text-yellow-400" />
              Pusat Notifikasi &amp; Informasi System
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
              Kumpulan Notifikasi
            </h1>
            <p className="mt-0.5 text-xs text-blue-200">
              Riwayat notifikasi pengerjaan, evaluasi, dan pembaruan sistem praktikum.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-white/20"
            >
              <CheckCheck size={16} />
              <span>Tandai Semua Dibaca ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200/80"
            }`}
          >
            Semua Notifikasi ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filter === "unread"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200/80"
            }`}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm animate-pulse flex items-start space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm font-bold text-gray-700">Tidak ada notifikasi pada kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className={`group flex items-start justify-between gap-4 rounded-2xl p-5 border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                notif.isRead
                  ? "bg-white border-gray-200/80 text-gray-600 hover:bg-blue-50/30"
                  : "bg-blue-50/90 border-blue-200 text-gray-900 shadow-sm border-l-4 border-l-blue-600 hover:bg-blue-100/70"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    notif.isRead ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700 font-bold"
                  }`}
                >
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-blue-700">
                    {notif.title}
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                </div>
              </div>

              {!notif.isRead && (
                <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                  Baru
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (user?.role === "ADMIN") {
    return (
      <AdminLayout>
        <TopProgressBar />
        {pageContent}
      </AdminLayout>
    )
  }

  if (user?.role === "DOSEN") {
    return (
      <LecturerLayout>
        {pageContent}
      </LecturerLayout>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {pageContent}
      </main>
    </div>
  )
}
