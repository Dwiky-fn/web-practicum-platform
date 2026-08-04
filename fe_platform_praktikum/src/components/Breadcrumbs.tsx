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
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true
  if (/^[0-9a-f]{6,}$/i.test(trimmed)) return true
  if (/^[a-z0-9_-]{8,}$/i.test(trimmed) && /[0-9]/.test(trimmed)) return true
  if (/^\d+$/.test(trimmed) && (trimmed.length >= 4 || Number(trimmed) > 100)) return true
  return false
}

function sanitizeLabel(label: string, prevSegment?: string): string {
  if (!label) return ""
  const trimmed = label.trim()

  if (/^(dosen|mahasiswa|user|lecturer|student|jobsheet|kelas|course|lecturers|students)\s+[0-9a-f\-_]{4,}$/i.test(trimmed)) {
    const prefix = trimmed.split(" ")[0].toLowerCase()
    if (prefix.includes("dosen") || prefix.includes("lecturer")) return "Profil Dosen"
    if (prefix.includes("mahasiswa") || prefix.includes("student")) return "Profil Mahasiswa"
    if (prefix.includes("jobsheet")) return "Detail Jobsheet"
    if (prefix.includes("kelas")) return "Detail Kelas"
    return "Detail"
  }

  if (isIdString(trimmed)) {
    const prev = (prevSegment || "").toLowerCase()
    if (prev.includes("lecturers") || prev.includes("lecturer") || prev.includes("dosen")) return "Profil Dosen"
    if (prev.includes("students") || prev.includes("student") || prev.includes("mahasiswa") || prev.includes("user") || prev.includes("users")) return "Profil Mahasiswa"
    if (prev.includes("mata-kuliah") || prev.includes("course") || prev.includes("courses")) return "Detail Mata Kuliah"
    if (prev.includes("jobsheet") || prev.includes("jobsheets")) return "Detail Jobsheet"
    if (prev.includes("kelas") || prev.includes("classes")) return "Detail Kelas"
    if (prev.includes("tahun-semester")) return "Detail Tahun Semester"
    if (prev.includes("experiment") || prev.includes("experiments")) return "Percobaan"
    if (prev.includes("exercise") || prev.includes("exercises")) return "Latihan"
    if (prev.includes("theory") || prev.includes("theories")) return "Teori"
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
  if (norm === "mahasiswa" || norm === "students") return "Mahasiswa"
  if (norm === "dosen" || norm === "lecturers") return "Dosen"
  if (norm === "tahun-semester") return "Tahun Semester"
  if (norm === "kelas-praktikum") return "Kelas Praktikum"
  if (norm === "kelas-mahasiswa") return "Kelas Mahasiswa"

  let label = segment.replace(/[-_]/g, " ")
  label = label.charAt(0).toUpperCase() + label.slice(1)
  return sanitizeLabel(label, prevSegment)
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const location = useLocation()

  let list: BreadcrumbItem[] = []

  if (items && items.length > 0) {
    list = items.map((item, idx) => {
      const prev = idx > 0 ? items[idx - 1].label : undefined
      return {
        label: sanitizeLabel(item.label, prev),
        to: item.to,
      }
    })
  } else {
    // Auto-generate breadcrumbs based on URL pathname
    const pathSegments = location.pathname.split("/").filter(Boolean)
    let currentPath = ""
    list = pathSegments.map((segment, index) => {
      currentPath += `/${segment}`
      const prevSegment = index > 0 ? pathSegments[index - 1] : undefined
      return {
        label: formatSegmentLabel(segment, prevSegment),
        to: currentPath,
      }
    })
  }

  // Deduplicate consecutive identical labels
  const filteredList: BreadcrumbItem[] = []
  list.forEach((item) => {
    if (!item.label) return
    if (filteredList.length === 0 || filteredList[filteredList.length - 1].label !== item.label) {
      filteredList.push(item)
    }
  })

  if (filteredList.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100/80 border border-gray-200/80 text-xs font-medium text-gray-600 shadow-2xs select-none pointer-events-none ${className}`}
    >
      <span className="inline-flex items-center text-gray-400">
        <Home size={13} />
        <span className="sr-only">Dashboard</span>
      </span>

      {filteredList.map((item, index) => {
        const isLast = index === filteredList.length - 1

        return (
          <span key={index} className="inline-flex items-center gap-1.5">
            <ChevronRight size={12} className="text-gray-300 shrink-0" />
            <span
              className={`truncate max-w-[200px] md:max-w-[320px] ${
                isLast ? "font-semibold text-gray-900" : "text-gray-500 font-normal"
              }`}
            >
              {item.label}
            </span>
          </span>
        )
      })}
    </nav>
  )
}
