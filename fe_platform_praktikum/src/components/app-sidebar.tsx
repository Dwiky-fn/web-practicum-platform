import { useEffect, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Settings,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar"
import { useCurrentUser } from "../services/user/useCurrentUser"

export function AppSidebar() {
  const location = useLocation()
  const { state, setOpen } = useSidebar()
  const { setUser } = useCurrentUser()
  const isCollapsed = state === "collapsed"

  const [academicOpen, setAcademicOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_academic_open")
    if (saved !== null) return saved === "true"
    return (
      location.pathname.startsWith("/admin/academic") ||
      location.pathname.startsWith("/mata-kuliah") ||
      location.pathname === "/academic"
    )
  })

  const [usersOpen, setUsersOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_users_open")
    if (saved !== null) return saved === "true"
    return location.pathname.startsWith("/users")
  })

  useEffect(() => {
    if (
      location.pathname.startsWith("/admin/academic") ||
      location.pathname.startsWith("/mata-kuliah") ||
      location.pathname === "/academic"
    ) {
      setAcademicOpen(true)
      localStorage.setItem("sidebar_academic_open", "true")
    }
    if (location.pathname.startsWith("/users")) {
      setUsersOpen(true)
      localStorage.setItem("sidebar_users_open", "true")
    }
  }, [location.pathname])

  const toggleAcademicOpen = (e: React.MouseEvent) => {
    if (isCollapsed) return
    e.stopPropagation()
    setAcademicOpen((prev) => {
      const next = !prev
      localStorage.setItem("sidebar_academic_open", String(next))
      return next
    })
  }

  const toggleUsersOpen = (e: React.MouseEvent) => {
    if (isCollapsed) return
    e.stopPropagation()
    setUsersOpen((prev) => {
      const next = !prev
      localStorage.setItem("sidebar_users_open", String(next))
      return next
    })
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("authUser")
    setUser(null)
    window.location.href = "/"
  }

  const isAcademicActive =
    location.pathname.startsWith("/admin/academic") ||
    location.pathname.startsWith("/mata-kuliah")

  const isUsersActive = location.pathname.startsWith("/users")

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Tombol Collapse di Bagian Atas Sidebar saat Expanded */}
      {!isCollapsed && (
        <SidebarHeader className="flex flex-row items-center justify-between py-2.5 px-3 border-b border-gray-100">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Navigasi Admin
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
            className="flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            title="Ciutkan Sidebar (Collapse)"
            aria-label="Ciutkan Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </SidebarHeader>
      )}

      {/* Sidebar Content */}
      <SidebarContent>
        {/* Group 1: Navigation Utama */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/dashboard"}>
                  <NavLink to="/dashboard">
                    <LayoutDashboard size={18} className="shrink-0" />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate font-bold">
                        Dashboard Admin
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 2: Data Akademik */}
        <SidebarGroup>
          <SidebarGroupLabel>Manajemen Akademik</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isAcademicActive}
                  onClick={toggleAcademicOpen}
                >
                  <BookOpen size={18} className="shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap truncate font-bold">
                        Data Akademik
                      </span>
                      {academicOpen ? (
                        <ChevronDown size={16} className="shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0" />
                      )}
                    </>
                  )}
                </SidebarMenuButton>

                {(academicOpen || isCollapsed) && (
                  <SidebarMenuSub>
                    {[
                      ["/admin/academic/kurikulum", "1. Kurikulum"],
                      ["/admin/academic/semester", "2. Semester"],
                      ["/admin/academic/mata-kuliah", "3. Mata Kuliah"],
                      ["/admin/academic/tahun-semester", "4. Tahun Semester"],
                      ["/admin/academic/kelas", "5. Kelas"],
                      ["/admin/academic/kelas-mahasiswa", "6. Kelas Mahasiswa"],
                      ["/admin/academic/kelas-praktikum", "7. Kelas Praktikum"],
                      ["/admin/academic/kenaikan-semester", "8. Kenaikan Semester"],
                    ].map(([to, label]) => (
                      <SidebarMenuSubItem key={to}>
                        <SidebarMenuSubButton asChild isActive={location.pathname === to}>
                          <NavLink to={to}>
                            <span className="whitespace-nowrap truncate">{label}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 3: Pengelolaan Pengguna */}
        <SidebarGroup>
          <SidebarGroupLabel>Pengelolaan Pengguna</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isUsersActive}
                  onClick={toggleUsersOpen}
                >
                  <Users size={18} className="shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap truncate font-bold">
                        Data Pengguna
                      </span>
                      {usersOpen ? (
                        <ChevronDown size={16} className="shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0" />
                      )}
                    </>
                  )}
                </SidebarMenuButton>

                {(usersOpen || isCollapsed) && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={location.pathname === "/users/students"}>
                        <NavLink to="/users/students">
                          <GraduationCap size={16} className="shrink-0" />
                          <span className="whitespace-nowrap truncate">Mahasiswa</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={location.pathname === "/users/lecturers"}>
                        <NavLink to="/users/lecturers">
                          <Users size={16} className="shrink-0" />
                          <span className="whitespace-nowrap truncate">Dosen</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 4: Pengaturan & Sistem */}
        <SidebarGroup>
          <SidebarGroupLabel>Pengaturan &amp; Sistem</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/panduan"}>
                  <NavLink to="/panduan">
                    <BookOpen size={18} className="shrink-0" />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate font-bold">Panduan</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/settings"}>
                  <NavLink to="/settings">
                    <Settings size={18} className="shrink-0" />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate font-bold">Pengaturan</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={18} className="text-red-500 shrink-0" />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap truncate font-bold">Keluar</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Rail */}
      <SidebarRail />
    </Sidebar>
  )
}
