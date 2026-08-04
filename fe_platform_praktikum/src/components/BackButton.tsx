import { ArrowLeft } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

export function getDefaultParentPath(pathname: string, search: string): string {
  const searchParams = new URLSearchParams(search)
  const classId = searchParams.get("classId") || searchParams.get("kelasPraktikumId")
  const courseId = searchParams.get("courseId") || searchParams.get("mataKuliahId")

  // Normalize path segments
  const path = pathname.replace(/\/+$/, "")

  // 1. Student / Lecturer Jobsheet Work Page
  // e.g. /mata-kuliah/:courseId/jobsheets/:jobsheetId/work
  if (path.endsWith("/work")) {
    return path.replace(/\/work$/, "")
  }

  // 2. Student Jobsheet Overview
  // e.g. /mata-kuliah/:courseId/jobsheets/:jobsheetId
  if (/\/mata-kuliah\/[^/]+\/jobsheets\/[^/]+$/.test(path)) {
    const cId = path.split("/")[2]
    return `/mata-kuliah/${cId}`
  }

  // 3. Student Course Detail
  // e.g. /mata-kuliah/:courseId
  if (/\/mata-kuliah\/[^/]+$/.test(path)) {
    return "/mata-kuliah"
  }

  // 4. Lecturer Review Page
  // e.g. /reviews/:submissionId
  if (path.startsWith("/reviews/")) {
    if (classId && courseId) return `/kelas-praktikum/${courseId}/${classId}`
    if (courseId) return `/mata-kuliah/${courseId}/jobsheets`
    return "/mata-kuliah"
  }

  // 5. Lecturer Jobsheet Editor Page
  // e.g. /jobsheets/create or /jobsheets/:id/edit
  if (path === "/jobsheets/create" || path.endsWith("/edit")) {
    if (courseId) return `/mata-kuliah/${courseId}/jobsheets`
    return "/mata-kuliah"
  }

  // 6. Lecturer Jobsheet Detail Page
  // e.g. /jobsheets/:jobsheetId
  if (path.startsWith("/jobsheets/")) {
    if (classId && courseId) return `/kelas-praktikum/${courseId}/${classId}`
    if (courseId) return `/mata-kuliah/${courseId}/jobsheets`
    return "/mata-kuliah"
  }

  // 7. Lecturer Class Jobsheet Management Page
  // e.g. /mata-kuliah/:courseId/jobsheets
  if (/\/mata-kuliah\/[^/]+\/jobsheets$/.test(path)) {
    if (classId) {
      const cId = path.split("/")[2]
      return `/kelas-praktikum/${cId}/${classId}`
    }
    return "/mata-kuliah"
  }

  // 8. Lecturer Class Detail Page
  // e.g. /kelas-praktikum\/[^/]+\/[^/]+$/.test(path)
  if (/\/kelas-praktikum\/[^/]+\/[^/]+$/.test(path)) {
    return "/mata-kuliah"
  }

  // 9. Lecturer Live Monitoring Page
  // e.g. /monitoring
  if (path === "/monitoring") {
    if (classId && courseId) return `/kelas-praktikum/${courseId}/${classId}`
    return "/mata-kuliah"
  }

  // 10. Admin User Profile Page
  // e.g. /users/students/:id or /users/lecturers/:id
  if (/\/users\/(students|lecturers)\/[^/]+$/.test(path)) {
    const role = path.split("/")[2]
    return `/users/${role}`
  }

  // 11. Admin Sub-pages & Academic Details
  if (path.startsWith("/admin/academic/tahun-semester/")) {
    if (path.includes("/kelas-mahasiswa")) {
      const tsId = path.split("/admin/academic/tahun-semester/")[1].split("/")[0]
      return `/admin/academic/tahun-semester/${tsId}`
    }
    return "/admin/academic/tahun-semester"
  }

  if (path.startsWith("/admin/academic/kelas-praktikum/")) {
    return "/admin/academic/tahun-semester"
  }

  if (path.startsWith("/admin/") && path !== "/admin/dashboard" && path !== "/admin") {
    if (path.startsWith("/admin/academic/")) return "/admin/academic/tahun-semester"
    return "/admin/dashboard"
  }

  // 12. Default Root Fallbacks
  if (path === "/mata-kuliah" || path === "/users/students" || path === "/users/lecturers") {
    return "/dashboard"
  }

  // General fallback: remove last segment of URL path
  const parts = path.split("/")
  if (parts.length > 2) {
    parts.pop()
    return parts.join("/")
  }

  return "/dashboard"
}

interface BackButtonProps {
  to?: string | number
  onClick?: () => void
  label?: string
  className?: string
}

export default function BackButton({ to, onClick, label = "Kembali", className = "" }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (typeof to === "string" && to.length > 0) {
      navigate(to)
    } else {
      const parentPath = getDefaultParentPath(location.pathname, location.search)
      navigate(parentPath)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 active:scale-97 cursor-pointer shrink-0 ${className}`}
      title={label}
    >
      <ArrowLeft size={15} className="shrink-0 text-gray-500 transition-colors group-hover:text-blue-600" />
      <span>{label}</span>
    </button>
  )
}
