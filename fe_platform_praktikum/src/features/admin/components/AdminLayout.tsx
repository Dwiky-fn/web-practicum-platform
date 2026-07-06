import { BookOpen, ChevronDown, ChevronRight, GraduationCap, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Users } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"

interface Props {
  children: React.ReactNode
}

const linkClass = ({ isActive, collapsed }: { isActive: boolean; collapsed: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-blue-50 font-semibold text-blue-700"
      : "text-gray-700 hover:bg-gray-100 hover:text-blue-700"
  } ${collapsed ? "justify-center" : ""}`

export default function AdminLayout({ children }: Props) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => (
    localStorage.getItem("adminSidebarCollapsed") === "true"
  ))
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("adminExpandedMenus") || "{}")
    } catch {
      return {}
    }
  })

  const isUsers = location.pathname.startsWith("/users")
  const isAcademic = location.pathname.startsWith("/admin/academic") || location.pathname === "/academic" || location.pathname.startsWith("/mata-kuliah") || location.pathname === "/courses"

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", String(collapsed))
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem("adminExpandedMenus", JSON.stringify(expandedMenus))
  }, [expandedMenus])

  const toggleMenu = (key: string) => {
    setExpandedMenus((current) => ({ ...current, [key]: !current[key] }))
  }

  const sidebar = (
    <aside
      className={`h-full border-r border-gray-200 bg-white py-6 transition-[width] duration-200 ${
        collapsed ? "w-20 px-3" : "w-72 px-5"
      }`}
    >
      <div className={`mb-8 flex items-start ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
        {!collapsed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin Panel</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Platform Praktikum</h2>
          </div>
        )}
        <button
          type="button"
          className="rounded-md p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Buka sidebar admin" : "Tutup sidebar admin"}
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="space-y-1">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => linkClass({ isActive, collapsed })}
          title="Dashboard Admin"
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard Admin</span>}
        </NavLink>
        <div className={linkClass({ isActive: isAcademic, collapsed })} title="Data Akademik">
          <NavLink to="/admin/academic/kurikulum" className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <BookOpen size={18} />
            {!collapsed && <span>Data Akademik</span>}
          </NavLink>
          {!collapsed && (
            <button
              type="button"
              className="ml-auto rounded p-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700"
              onClick={() => toggleMenu("academic")}
              aria-label={expandedMenus.academic ? "Tutup submenu Data Akademik" : "Buka submenu Data Akademik"}
              title={expandedMenus.academic ? "Tutup submenu" : "Buka submenu"}
            >
              {expandedMenus.academic ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
        {expandedMenus.academic && !collapsed && (
          <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-3">
            {[
              ["/admin/academic/kurikulum", "Kurikulum"],
              ["/admin/academic/semester", "Semester"],
              ["/admin/academic/mata-kuliah", "Mata Kuliah"],
              ["/admin/academic/kelas", "Kelas"],
              ["/admin/academic/tahun-semester", "Tahun Semester"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => linkClass({ isActive, collapsed: false })}
              >
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
        <div className={linkClass({ isActive: isUsers, collapsed })} title="Data Pengguna">
          <NavLink to="/users/students" className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Users size={18} />
            {!collapsed && <span>Data Pengguna</span>}
          </NavLink>
          {!collapsed && (
            <button
              type="button"
              className="ml-auto rounded p-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700"
              onClick={() => toggleMenu("users")}
              aria-label={expandedMenus.users ? "Tutup submenu Data Pengguna" : "Buka submenu Data Pengguna"}
              title={expandedMenus.users ? "Tutup submenu" : "Buka submenu"}
            >
              {expandedMenus.users ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>

        {expandedMenus.users && !collapsed && (
          <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-3">
            <NavLink
              to="/users/students"
              className={({ isActive }) => linkClass({ isActive, collapsed: false })}
            >
              <GraduationCap size={18} />
              <span>Mahasiswa</span>
            </NavLink>
            <NavLink
              to="/users/lecturers"
              className={({ isActive }) => linkClass({ isActive, collapsed: false })}
            >
              <Users size={18} />
              <span>Dosen</span>
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar navItems={[]} mobileEnabled={false} />
      <TopProgressBar />

      <div className="flex">
        <div className="sticky top-0 h-screen shrink-0">
          {sidebar}
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
