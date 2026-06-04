import { Bell, ChevronDown, Menu, X } from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import logo from "../../../assets/logopolnep.jpg"
import Avatar from "../../../components/Avatar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"

interface Props {
  children: React.ReactNode
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-blue-50 font-semibold text-blue-700"
      : "text-gray-700 hover:bg-gray-100 hover:text-blue-700"
  }`

export default function AdminLayout({ children }: Props) {
  const { user } = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const closeSidebar = () => setSidebarOpen(false)
  const isUsers = location.pathname.startsWith("/admin/users")

  const sidebar = (
    <aside className="h-full w-72 border-r border-gray-200 bg-white px-5 py-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin Panel</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">Platform Praktikum</h2>
      </div>

      <nav className="space-y-1">
        <NavLink to="/admin" end className={linkClass} onClick={closeSidebar}>
          Dashboard Admin
        </NavLink>
        <NavLink to="/admin/academic" className={linkClass} onClick={closeSidebar}>
          Manajemen Akademik
        </NavLink>
        <NavLink to="/admin/users/students" className={linkClass} onClick={closeSidebar}>
          Data Pengguna
        </NavLink>

        {isUsers && (
          <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-3">
            <NavLink to="/admin/users/students" className={linkClass} onClick={closeSidebar}>
              Mahasiswa
            </NavLink>
            <NavLink to="/admin/users/lecturers" className={linkClass} onClick={closeSidebar}>
              Dosen
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-blue-900/20 bg-blue-800 shadow-sm">
        <div className="flex h-20 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-md p-2 text-white hover:bg-blue-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu admin"
            >
              <Menu size={24} />
            </button>
            <div className="hidden items-center gap-4 sm:flex">
              <div className="rounded-xl bg-white p-2 shadow-sm">
                <img src={logo} alt="Logo Polnep" className="h-10 w-10 rounded-lg object-cover" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Sistem Praktikum Berbasis Web</p>
                <p className="text-xs text-sky-100">Admin Program Studi Teknik Informatika</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              className="rounded-full p-2 text-white hover:bg-blue-700"
              aria-label="Notifikasi"
            >
              <Bell size={22} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-3 rounded-full px-2 py-1 text-white hover:bg-blue-700"
            >
              <Avatar
                avatarUrl={user?.avatarUrl}
                fullname={user?.fullname ?? "Admin"}
                size={42}
              />
              <span className="hidden text-sm font-semibold md:inline">
                {user?.fullname ?? "Admin"}
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <div className="sticky top-20 hidden h-[calc(100vh-5rem)] lg:block">
          {sidebar}
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-gray-900/50"
              onClick={closeSidebar}
              aria-label="Tutup menu admin"
            />
            <div className="relative h-full w-72 bg-white shadow-xl">
              <button
                type="button"
                className="absolute right-3 top-3 rounded-md p-2 text-gray-600 hover:bg-gray-100"
                onClick={closeSidebar}
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
