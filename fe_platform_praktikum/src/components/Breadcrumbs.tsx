import { useLocation } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

function isIdString(str: string): boolean {
  if (!str) return false
  const trimmed = str.trim()
  // Check UUIDs, CUIDs, numeric IDs, or long random hashes
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true
  if (/^[a-z0-9]{18,}$/i.test(trimmed)) return true
  if (/^\d+$/.test(trimmed) && (trimmed.length >= 4 || Number(trimmed) > 100)) return true
  return false
}

function sanitizeLabel(label: string, prevSegment?: string): string {
  if (!label) return ""
  if (isIdString(label)) {
    const prev = (prevSegment || "").toLowerCase()
    if (prev.includes("mata-kuliah") || prev.includes("course")) return "Detail Mata Kuliah"
    if (prev.includes("jobsheet")) return "Detail Jobsheet"
    if (prev.includes("kelas")) return "Detail Kelas"
    if (prev.includes("user") || prev.includes("student") || prev.includes("mahasiswa")) return "Detail Mahasiswa"
    if (prev.includes("tahun-semester")) return "Detail Tahun Semester"
    if (prev.includes("experiment")) return "Percobaan"
    if (prev.includes("exercise")) return "Latihan"
    if (prev.includes("theory")) return "Teori"
    return "Detail"
  }
  return label
}

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  const norm = segment.toLowerCase()

  if (isIdString(segment)) {
    return sanitizeLabel(segment, prevSegment)
  }

  if (norm === "admin") return "Admin"
  if (norm === "mata-kuliah") return "Mata Kuliah"
  if (norm === "dashboard") return "Dashboard"
  if (norm === "jobsheets" || norm === "jobsheet") return "Jobsheet"
  if (norm === "works" || norm === "work") return "Workspace"
  if (norm === "users") return "Kelola User"
  if (norm === "academic") return "Data Akademik"
  if (norm === "departments") return "Jurusan & Prodi"
  if (norm === "notifications" || norm === "notifikasi") return "Notifikasi"
  if (norm === "settings" || norm === "pengaturan") return "Pengaturan"
  if (norm === "panduan") return "Panduan"
  if (norm === "mahasiswa") return "Mahasiswa"
  if (norm === "dosen") return "Dosen"
  if (norm === "tahun-semester") return "Tahun Semester"
  if (norm === "kelas-praktikum") return "Kelas Praktikum"
  if (norm === "kelas-mahasiswa") return "Kelas Mahasiswa"

  let label = segment.replace(/[-_]/g, " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const location = useLocation()

  let rawList: string[] = []

  if (items && items.length > 0) {
    rawList = items.map((item, idx) => {
      const prev = idx > 0 ? items[idx - 1].label : undefined
      return sanitizeLabel(item.label, prev)
    })
  } else {
    // Auto-generate breadcrumbs based on URL pathname
    const pathSegments = location.pathname.split("/").filter(Boolean)
    rawList = pathSegments.map((segment, index) => {
      const prevSegment = index > 0 ? pathSegments[index - 1] : undefined
      return formatSegmentLabel(segment, prevSegment)
    })
  }

  // Deduplicate consecutive identical labels (e.g., "Mata Kuliah" > "Mata Kuliah")
  const filteredList: string[] = []
  rawList.forEach((label) => {
    if (!label) return
    if (filteredList.length === 0 || filteredList[filteredList.length - 1] !== label) {
      filteredList.push(label)
    }
  })

  if (filteredList.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-gray-500 py-2 px-1 select-none pointer-events-none ${className}`}>
      <div className="inline-flex items-center space-x-1.5 md:space-x-2 flex-wrap">
        <span className="inline-flex items-center text-gray-400">
          <Home size={13} className="mr-1" />
          <span className="sr-only">Home</span>
        </span>
        {filteredList.map((label, index) => {
          const isLast = index === filteredList.length - 1
          return (
            <span key={index} className="inline-flex items-center gap-1.5 md:gap-2">
              <ChevronRight size={12} className="text-gray-300 shrink-0" />
              <span
                className={`truncate max-w-[200px] md:max-w-[320px] ${
                  isLast ? "font-semibold text-gray-800" : "font-normal text-gray-500"
                }`}
              >
                {label}
              </span>
            </span>
          )
        })}
      </div>
    </nav>
  )
}
