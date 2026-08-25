import { Menu, MessageSquare } from "lucide-react"
import { NavLink } from "react-router-dom"
import NotificationBell from "./NotificationBell"
import ProfileMenu from "./ProfileMenu"
import type { Notification } from "../../services/notification/types"
import type { User } from "../../services/user/types"

interface DesktopNavbarProps {
  user: User | null
  logo: string
  pattern: string
  navItems: Array<{
    to: string
    label: string
  }>
  showMobileButton: boolean
  notifications: Notification[]
  unreadCount: number
  chatUnreadCount?: number

  notifOpen: boolean
  profileOpen: boolean

  onToggleNotif: () => void
  onToggleProfile: () => void
  onOpenMobile: () => void
  onMarkAllNotif: () => void
  onMarkItemRead?: (id: string) => void

  onOpenChat?: () => void
  onGuide?: () => void
  onSettings: () => void
  onLogout: () => void
}

export default function DesktopNavbar({
  user,
  logo,
  pattern,
  navItems,
  showMobileButton,
  notifications,
  unreadCount,
  chatUnreadCount,
  notifOpen,
  profileOpen,
  onToggleNotif,
  onToggleProfile,
  onOpenMobile,
  onMarkAllNotif,
  onMarkItemRead,
  onOpenChat,
  onGuide,
  onSettings,
  onLogout,
}: DesktopNavbarProps) {

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `pb-1 transition ${
      isActive
        ? "text-white font-semibold border-b-2 border-white"
        : "text-white hover:text-sky-300 active:text-sky-300"
    }`

  return (
    <nav className="relative z-50 w-full bg-blue-800 shadow-sm px-10 py-6 flex justify-between items-center">

      {/* Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={pattern}
          alt="pattern"
          className="absolute right-0 top-0 w-125 opacity-10 rotate-45 translate-x-1/3 -translate-y-1/4"
        />
      </div>

      {/* LEFT */}
      <div className="flex items-center relative z-10">

        {/* Hamburger Mobile */}
        {showMobileButton && (
          <button
            className="md:hidden"
            onClick={onOpenMobile}
          >
            <Menu size={26} className="text-white" />
          </button>
        )}

        {/* Desktop Logo + Menu */}
        <div className="hidden md:flex items-start gap-6">

          {/* Logo */}
          <div className="bg-white p-2 rounded-xl shadow-sm">
            <img
              src={logo}
              alt="Logo"
              className="h-12 w-12 object-cover rounded-lg"
            />
          </div>

          {/* Text + Menu */}
          <div className="flex flex-col">

            {/* Title */}
            <div className="leading-tight mb-3">
              <p className="text-white font-semibold text-sm">
                Platform Praktikum Pemrograman
              </p>
              <p className="text-sky-200 text-xs">
                Teknik Informatika
              </p>
            </div>

            {navItems.length > 0 && (
              <div className="flex gap-6">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navClass}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5 relative z-10">

        {user?.role === "DOSEN" && onOpenChat && (
          <button
            type="button"
            onClick={() => onOpenChat && onOpenChat()}
            id="chat-nav-button"
            className="relative flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/10 transition cursor-pointer"
            title="Buka Chat"
          >
            <MessageSquare size={20} />
            {Boolean(chatUnreadCount) && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white animate-pulse">
                {chatUnreadCount! > 9 ? "9+" : chatUnreadCount}
              </span>
            )}
          </button>
        )}

        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          open={notifOpen}
          onToggle={onToggleNotif}
          onMarkAll={onMarkAllNotif}
          onMarkItemRead={onMarkItemRead}
        />

        <ProfileMenu
          user={user}
          open={profileOpen}
          onToggle={onToggleProfile}
          onGuide={onGuide}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </nav>
  )
}
