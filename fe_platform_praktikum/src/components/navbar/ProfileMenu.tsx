import { BookOpen, LogOut, Settings } from "lucide-react"
import type { User as AppUser } from "../../services/user/types"
import Avatar from "../Avatar"

interface ProfileMenuProps {
  user: AppUser | null
  open: boolean
  disabled?: boolean
  onToggle: () => void
  onGuide?: () => void
  onSettings: () => void
  onLogout: () => void
}

export default function ProfileMenu({
  user,
  open,
  disabled = false,
  onToggle,
  onGuide,
  onSettings,
  onLogout,
}: ProfileMenuProps) {
  const isMenuDisabled = disabled || user?.role === "ADMIN"

  return (
    <div id="profile-menu-container" className="relative">
      <div
        className={`flex items-center gap-2.5 rounded-full p-1 text-white select-none ${
          isMenuDisabled
            ? "cursor-default opacity-90"
            : "transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
        }`}
        onClick={() => {
          if (!isMenuDisabled) onToggle()
        }}
      >
        <Avatar
          avatarUrl={user?.avatarUrl}
          fullname={user?.fullname ?? '?'}
          size={36}
        />

        <span className="hidden md:block text-xs font-bold text-white max-w-40 truncate">
          {user ? user.fullname : "Loading..."}
        </span>
      </div>

      {!isMenuDisabled && (
        <div
          className={`
            absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-2 shadow-2xl z-50
            transition-all duration-200 ease-out origin-top-right
            hidden md:block
            ${open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
          `}
        >
          {/* User Info Header */}
          <div className="border-b border-gray-100 px-3 py-2.5 mb-1">
            <p className="text-xs font-bold text-gray-900 truncate">{user?.fullname ?? "User"}</p>
            <p className="text-[11px] font-medium text-gray-500 truncate">{user?.email ?? "-"}</p>
            <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 uppercase">
              {user?.role ?? "User"}
            </span>
          </div>

          {onGuide && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                onGuide()
              }}
            >
              <BookOpen size={16} className="text-gray-500" />
              <span>Panduan</span>
            </button>
          )}

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 mt-0.5"
            onClick={() => {
              onSettings()
            }}
          >
            <Settings size={16} className="text-gray-500" />
            <span>Pengaturan</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 mt-0.5"
            onClick={() => {
              onLogout()
            }}
          >
            <LogOut size={16} className="text-red-500" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  )
}