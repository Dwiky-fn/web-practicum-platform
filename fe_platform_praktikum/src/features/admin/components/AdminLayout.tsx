import { SidebarProvider, SidebarInset } from "../../../components/ui/sidebar"
import { AppSidebar } from "../../../components/app-sidebar"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import ScrollToTopButton from "../../../components/ScrollToTopButton"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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
            {children}
          </main>
          <ScrollToTopButton />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
