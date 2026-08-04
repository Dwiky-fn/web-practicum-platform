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
}

export default function AdminLayout({ children, breadcrumbItems, backTo, onBack }: AdminLayoutProps) {
  const showBackButton = backTo !== undefined || onBack !== undefined

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
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {showBackButton && (
                <BackButton to={backTo} onClick={onBack} />
              )}
              <Breadcrumbs items={breadcrumbItems} />
            </div>
            {children}
          </main>
          <ScrollToTopButton />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
