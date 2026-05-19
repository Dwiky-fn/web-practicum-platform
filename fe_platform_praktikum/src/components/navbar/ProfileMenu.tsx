import type { User as AppUser } from "../../services/user/types"
import Avatar from "../Avatar"

interface ProfileMenuProps {
  user: AppUser | null
  open: boolean
  onToggle: () => void
  onSettings: () => void
  onLogout: () => void
}

export default function ProfileMenu({
  user,
  open,
  onToggle,
  onSettings,
  onLogout,
}: ProfileMenuProps) {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 cursor-pointer group transition-colors duration-200"
        onClick={onToggle}
      >
        <Avatar
          avatarUrl={user?.avatarUrl}
          fullname={user?.fullname ?? '?'}
          size={36}
        />

        <span className="hidden md:block font-medium text-white group-hover:text-gray-400 group-active:text-gray-400 transition-colors">
          {user ? user.fullname : "Loading..."}
        </span>
      </button>

      <div
        className={`
          absolute right-0 mt-3 w-44 bg-white rounded-xl shadow-lg py-2 z-50
          transition-all duration-200 ease-out origin-top-right
          hidden md:block
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <button
          className="w-full text-left px-4 py-2 cursor-pointer hover:bg-gray-200"
          onClick={onSettings}
        >
          Pengaturan
        </button>

        <button
          className="w-full text-left px-4 py-2 cursor-pointer hover:bg-gray-200 text-red-500"
          onClick={onLogout}
        >
          Keluar
        </button>
      </div>
    </div>
  )
}