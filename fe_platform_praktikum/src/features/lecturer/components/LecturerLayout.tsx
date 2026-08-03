import { createContext, useContext } from "react"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import ScrollToTopButton from "../../../components/ScrollToTopButton"
import Breadcrumbs from "../../../components/Breadcrumbs"

const LecturerLayoutContext = createContext(false)

const lecturerNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/mata-kuliah", label: "Mata Kuliah" },
]

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  const inLayout = useContext(LecturerLayoutContext)

  if (inLayout) {
    return <>{children}</>
  }

  return (
    <LecturerLayoutContext.Provider value={true}>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar navItems={lecturerNavItems} />
        <TopProgressBar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
          <Breadcrumbs className="mb-3" />
          {children}
        </main>
        <ScrollToTopButton />
      </div>
    </LecturerLayoutContext.Provider>
  )
}
