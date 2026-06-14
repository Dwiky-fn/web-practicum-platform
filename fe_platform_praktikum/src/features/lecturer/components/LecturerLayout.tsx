import { createContext, useContext } from "react"
import Navbar from "../../../components/navbar/Navbar"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import ScrollToTopButton from "../../../components/ScrollToTopButton"

const LecturerLayoutContext = createContext(false)

const lecturerNavItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/courses", label: "Mata Kuliah" },
  { to: "/monitoring", label: "Monitoring" },
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
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
        <ScrollToTopButton />
      </div>
    </LecturerLayoutContext.Provider>
  )
}
