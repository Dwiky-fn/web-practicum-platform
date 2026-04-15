import { Menu } from "lucide-react"
import { NavLink } from "react-router-dom"
import NotificationBell from "./NotificationBell"
import ProfileMenu from "./ProfileMenu"
import type { Notification } from "../../entities/notification/types"
import type { CurrentUser } from "../../entities/currentUser/types"

interface DesktopNavbarProps {
  user: CurrentUser | null
  logo: string
  pattern: string
  notifications: Notification[]
  unreadCount: number

  notifOpen: boolean
  profileOpen: boolean

  onToggleNotif: () => void
  onToggleProfile: () => void
  onOpenMobile: () => void
  onMarkAllNotif: () => void

  onSettings: () => void
  onLogout: () => void
}

export default function DesktopNavbar({
  user,
  logo,
  pattern,
  notifications,
  unreadCount,
  notifOpen,
  profileOpen,
  onToggleNotif,
  onToggleProfile,
  onOpenMobile,
  onMarkAllNotif,
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
        <button
          className="md:hidden"
          onClick={onOpenMobile}
        >
          <Menu size={26} className="text-white" />
        </button>

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
                Platform Praktikum
              </p>
              <p className="text-sky-200 text-xs">
                Teknik Informatika
              </p>
            </div>

            {/* Menu */}
            <div className="flex gap-6">
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>

              <NavLink to="/courses" className={navClass}>
                Mata Kuliah
              </NavLink>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6 relative z-10">

        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          open={notifOpen}
          onToggle={onToggleNotif}
          onMarkAll={onMarkAllNotif}
        />

        <ProfileMenu
          user={user}
          open={profileOpen}
          onToggle={onToggleProfile}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </nav>
  )
}
