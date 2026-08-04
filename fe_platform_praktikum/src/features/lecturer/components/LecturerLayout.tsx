import { createContext, useContext } from "react"
import { useLocation } from "react-router-dom"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import ScrollToTopButton from "../../../components/ScrollToTopButton"
import Breadcrumbs, { type BreadcrumbItem } from "../../../components/Breadcrumbs"
import BackButton from "../../../components/BackButton"

const LecturerLayoutContext = createContext(false)

const lecturerNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/mata-kuliah", label: "Mata Kuliah" },
]

interface LecturerLayoutProps {
  children: React.ReactNode
  breadcrumbItems?: BreadcrumbItem[]
  backTo?: string | number
  onBack?: () => void
  showBack?: boolean
}

export default function LecturerLayout({ children, breadcrumbItems, backTo, onBack, showBack }: LecturerLayoutProps) {
  const inLayout = useContext(LecturerLayoutContext)
  const location = useLocation()

  if (inLayout) {
    return <>{children}</>
  }

  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/"
  const shouldShowBackButton = showBack ?? (!isDashboard || backTo !== undefined || onBack !== undefined)

  return (
    <LecturerLayoutContext.Provider value={true}>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar navItems={lecturerNavItems} />
        <TopProgressBar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {shouldShowBackButton && (
              <BackButton to={backTo} onClick={onBack} />
            )}
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          {children}
        </main>
        <ScrollToTopButton />
      </div>
    </LecturerLayoutContext.Provider>
  )
}
