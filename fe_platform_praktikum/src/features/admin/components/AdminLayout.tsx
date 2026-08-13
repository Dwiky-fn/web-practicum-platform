import { useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "../../../components/ui/sidebar"
import { AppSidebar } from "../../../components/app-sidebar"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import ScrollToTopButton from "../../../components/ScrollToTopButton"
import Breadcrumbs, { type BreadcrumbItem } from "../../../components/Breadcrumbs"
import BackButton from "../../../components/BackButton"

interface AdminLayoutProps {
  children: React.ReactNode
  breadcrumbItems?: BreadcrumbItem[]
  backTo?: string | number
  onBack?: () => void
  showBack?: boolean
  rightContent?: React.ReactNode
}

export default function AdminLayout({ children, breadcrumbItems, backTo, onBack, showBack, rightContent }: AdminLayoutProps) {
  const location = useLocation()
  const path = location.pathname.replace(/\/+$/, "")
  const isMainIndexPage =
    path === "/dashboard" ||
    path === "/admin" ||
    path === "/admin/dashboard" ||
    path === "" ||
    path === "/" ||
    path === "/users/students" ||
    path === "/users/lecturers" ||
    path === "/admin/academic" ||
    path === "/admin/academic/tahun-semester" ||
    path === "/admin/academic/kurikulum" ||
    path === "/admin/academic/semester" ||
    path === "/admin/academic/kelas" ||
    path === "/admin/academic/mata-kuliah" ||
    path === "/admin/academic/departments"

  const shouldShowBackButton = showBack ?? (!isMainIndexPage && (backTo !== undefined || onBack !== undefined))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Top Navbar Header (Diselaraskan dengan Tema Dosen & Mahasiswa) */}
      <Navbar mobileEnabled={true} />
      <TopProgressBar />

      {/* Sidebar & Content Area */}
      <SidebarProvider defaultOpen={true} className="flex-1 min-h-0">
        {/* Shadcn App Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <SidebarInset>
          <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {shouldShowBackButton && (
                  <BackButton to={backTo} onClick={onBack} />
                )}
                <Breadcrumbs items={breadcrumbItems} />
              </div>
              {rightContent && (
                <div className="flex-shrink-0">{rightContent}</div>
              )}
            </div>
            {children}
          </main>
          <ScrollToTopButton />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
