import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, RefreshCw, Search, Users } from "lucide-react"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import BackButton from "../../../components/BackButton"
import { toast } from "../../../components/toast/toastStore"
import {
  getClassJobsheetMonitoring,
  getMonitoringLocationDetail,
  type LocationDetailResponse,
  type LocationDetailStudent,
  type MonitoringGroup,
  type MonitoringLocation,
  type MonitoringResponse,
  type MonitoringStudent,
} from "../../../services/lecturerMonitoring"
import { formatAcademicTime } from "../../../shared/utils/formatAcademicDateTime"
import { connectMonitoringSse, type MonitoringSseEvent } from "../../../services/monitoringSse"

function formatTime(value?: string | null) {
  if (!value) return "-"
  return formatAcademicTime(value)
}

function locationKey(item?: Pick<MonitoringLocation, "moduleType" | "moduleId" | "stepId"> | null) {
  if (!item) return ""
  return `${item.moduleType}:${item.moduleId}:${item.stepId ?? ""}`
}

function isSameLocation(item: MonitoringLocation, event: MonitoringSseEvent) {
  const targetExpId = event.experimentId || event.sectionId
  const targetExeId = event.exerciseId || event.sectionId

  if (targetExpId && item.moduleId) {
    const targetStr = String(targetExpId)
    const itemStr = String(item.moduleId)
    if (targetStr === itemStr || targetStr.startsWith(`${itemStr}:`) || itemStr.startsWith(`${targetStr}:`)) {
      return true
    }
  }

  if (targetExeId && item.moduleId) {
    if (String(targetExeId) === String(item.moduleId)) {
      return true
    }
  }

  if (event.sectionName && item.title) {
    const sName = event.sectionName.trim().toLowerCase()
    const iTitle = item.title.trim().toLowerCase()
    if (sName === iTitle || iTitle.startsWith(sName) || sName.startsWith(iTitle)) {
      return true
    }
  }

  return false
}

function firstLocation(groups: MonitoringGroup[]) {
  return groups.flatMap((group) => group.children)[0] ?? null
}

function Avatar({ student, locationTitle }: { student: MonitoringStudent; locationTitle: string }) {
  return (
    <span
      title={`${student.name}\nSedang atau terakhir aktif di ${locationTitle}\nTerakhir diperbarui: ${formatTime(student.lastUpdatedAt)}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-blue-100 text-[11px] font-semibold text-blue-700 shadow-sm"
    >
      {student.profilePhotoUrl ? (
        <img src={student.profilePhotoUrl} alt={student.name} className="h-full w-full object-cover" />
      ) : (
        student.initials
      )}
    </span>
  )
}

function AvatarStack({ item, onOpenStudent }: { item: MonitoringLocation; onOpenStudent: (studentId: string) => void }) {
  if (!item.avatars.length) return <span className="text-xs text-gray-400">-</span>
  return (
    <div className="flex items-center justify-end">
      <div className="flex -space-x-2">
        {item.avatars.map((student) => (
          <button
            key={student.studentId}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpenStudent(student.studentId)
            }}
          >
            <Avatar student={student} locationTitle={item.title} />
          </button>
        ))}
      </div>
      {item.remainingAvatarCount > 0 && (
        <span
          title={[
            "Mahasiswa lain pada bagian ini:",
            ...(item.remainingAvatars ?? []).map((student) => `- ${student.name}`),
          ].join("\n")}
          className="ml-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600"
        >
          +{item.remainingAvatarCount}
        </span>
      )}
    </div>
  )
}

function ModuleSidebar({
  groups,
  selected,
  onSelect,
  onOpenStudent,
}: {
  groups: MonitoringGroup[]
  selected: MonitoringLocation | null
  onSelect: (item: MonitoringLocation) => void
  onOpenStudent: (studentId: string) => void
}) {
  const selectedKey = locationKey(selected)
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-white lg:flex">
      <div className="border-b border-gray-200 px-4 py-4">
        <div className="text-sm font-semibold text-gray-900">Daftar Modul</div>
        <div className="mt-1 text-xs text-gray-500">Avatar menunjukkan posisi terakhir tersimpan.</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {groups.map((group) => (
          <section key={group.id} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</h3>
            <div className="space-y-1">
              {group.children.map((item) => {
                const active = locationKey(item) === selectedKey
                return (
                  <button
                    key={locationKey(item)}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      active ? "bg-blue-50 text-blue-800" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="min-w-0 truncate flex items-center justify-between gap-1 pr-1">
                      <span className="truncate">{item.title}</span>
                      {Boolean(item.runningCount) && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-xs font-bold text-rose-700 shrink-0">
                          {item.runningCount}
                        </span>
                      )}
                    </span>
                    <AvatarStack item={item} onOpenStudent={onOpenStudent} />
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}

function renderInstruction(instruction: unknown) {
  if (!instruction) return <p className="text-sm text-gray-500">Instruksi belum tersedia.</p>
  if (typeof instruction === "string") {
    return <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{instruction}</p>
  }
  if (typeof instruction === "object") {
    return <RichTextViewer content={instruction as never} role="DOSEN" mode="viewer-default" />
  }
  return <p className="text-sm text-gray-500">Instruksi belum tersedia.</p>
}

function statusWeight(status: LocationDetailStudent["locationStatus"]) {
  if (status === "active_here") return 0
  if (status === "completed_here") return 1
  if (status === "elsewhere") return 2
  return 3
}

function ModuleStudents({
  detail,
  search,
  status,
  onSearch,
  onStatus,
  onOpenStudent,
}: {
  detail: LocationDetailResponse
  search: string
  status: string
  onSearch: (value: string) => void
  onStatus: (value: string) => void
  onOpenStudent: (studentId: string) => void
}) {
  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return detail.students
      .filter((student) => {
        const matchKeyword = !keyword || student.name.toLowerCase().includes(keyword) || student.nim.toLowerCase().includes(keyword)
        const matchStatus = status === "all" || student.locationStatus === status
        return matchKeyword && matchStatus
      })
      .sort((left, right) => {
        const statusDiff = statusWeight(left.locationStatus) - statusWeight(right.locationStatus)
        if (statusDiff !== 0) return statusDiff
        const rightTime = right.lastUpdatedAt ? new Date(right.lastUpdatedAt).getTime() : 0
        const leftTime = left.lastUpdatedAt ? new Date(left.lastUpdatedAt).getTime() : 0
        if (rightTime !== leftTime) return rightTime - leftTime
        return left.name.localeCompare(right.name, "id-ID")
      })
  }, [detail.students, search, status])

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mahasiswa pada Bagian Ini</h2>
          <p className="text-sm text-gray-500">
            {detail.statistics.activeCount} aktif di bagian ini, {detail.statistics.completedCount} sudah menyelesaikan.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative block md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cari nama atau NIM mahasiswa"
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">Semua</option>
            <option value="active_here">Sedang Mengerjakan</option>
            <option value="completed_here">Sudah Menyelesaikan</option>
            <option value="not_started_here">Belum Memulai</option>
            <option value="elsewhere">Berada di Modul Lain</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Mahasiswa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Jumlah Eksekusi</th>
              <th className="px-4 py-3">Terakhir Diperbarui</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((student) => (
              <tr key={student.studentId}>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpenStudent(student.studentId)} className="flex items-center gap-3 text-left">
                    <Avatar student={student} locationTitle={detail.location.title} />
                    <span>
                      <span className="block font-medium text-gray-900">{student.name}</span>
                      <span className="block text-xs text-gray-500">{student.nim}</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">{student.status}</td>
                <td className="px-4 py-3 text-center font-mono font-semibold text-gray-800">
                  {student.runCount ?? 0} kali
                </td>
                <td className="px-4 py-3">{formatTime(student.lastUpdatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenStudent(student.studentId)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Lihat Pengerjaan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="bg-white px-4 py-10 text-center text-sm text-gray-500">Tidak ada mahasiswa untuk filter ini.</div>}
      </div>
    </section>
  )
}

import LecturerChatDrawer from "../components/LecturerChatDrawer"
import { useSearchParams } from "react-router-dom"

export default function LecturerClassJobsheetMonitoringPage() {
  const { kelasPraktikumId = "", jobsheetId = "" } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { goBackToParent } = useBackNavigation()
  const [data, setData] = useState<MonitoringResponse | null>(null)
  const [selected, setSelected] = useState<MonitoringLocation | null>(null)
  const [detail, setDetail] = useState<LocationDetailResponse | null>(null)
  const [attemptType, setAttemptType] = useState("normal")
  const [remedialId, setRemedialId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [studentStatus, setStudentStatus] = useState("all")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedChatStudentId, setSelectedChatStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("openChat") === "true") {
      const studentId = searchParams.get("studentId")
      if (studentId) {
        setSelectedChatStudentId(studentId)
      }
      setIsChatOpen(true)
      searchParams.delete("openChat")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const flatLocations = useMemo(() => data?.sidebar.flatMap((group) => group.children) ?? [], [data])
  const selectedIndex = flatLocations.findIndex((item) => locationKey(item) === locationKey(selected))
  const previousLocation = selectedIndex > 0 ? flatLocations[selectedIndex - 1] : null
  const nextLocation = selectedIndex >= 0 && selectedIndex < flatLocations.length - 1 ? flatLocations[selectedIndex + 1] : null

  const fetchLocation = useCallback(async (item: MonitoringLocation, resetFilters = false) => {
    setSelected(item)
    if (resetFilters) {
      setStudentSearch("")
      setStudentStatus("all")
    }
    const nextDetail = await getMonitoringLocationDetail(kelasPraktikumId, jobsheetId, item, attemptType, remedialId)
    setDetail(nextDetail)
  }, [attemptType, jobsheetId, kelasPraktikumId, remedialId])

  const loadMonitoring = useCallback(async (silent = false) => {
    if (!kelasPraktikumId || !jobsheetId) return
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const next = await getClassJobsheetMonitoring(kelasPraktikumId, jobsheetId, attemptType, remedialId)
      setData(next)
      const currentKey = locationKey(selected)
      const nextSelected = next.sidebar
        .flatMap((group) => group.children)
        .find((item) => locationKey(item) === currentKey) ?? firstLocation(next.sidebar)
      if (nextSelected) {
        setSelected(nextSelected)
        const nextDetail = await getMonitoringLocationDetail(kelasPraktikumId, jobsheetId, nextSelected, attemptType, remedialId)
        setDetail(nextDetail)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat monitoring kelas.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [attemptType, jobsheetId, kelasPraktikumId, remedialId, selected])

  useEffect(() => {
    setSelected(null)
    setDetail(null)
    setStudentSearch("")
    setStudentStatus("all")
    loadMonitoring()
  }, [attemptType, remedialId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMonitoring(true)
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [loadMonitoring])

  const handleSseEvent = useCallback((event: MonitoringSseEvent) => {
    console.log("[MONITORING-UI][REALTIME-UPDATE] Processing SSE event:", event.type, event)

    if (event.type === "student-position-updated" || event.type === "student-monitoring-updated") {
      if (!event.studentId) return

      setData((prevData) => {
        if (!prevData) return prevData

        let extractedStudent: MonitoringStudent | null = null
        for (const grp of prevData.sidebar) {
          for (const loc of grp.children) {
            const match = loc.avatars.find((s) => s.studentId === event.studentId) ||
                          loc.remainingAvatars?.find((s) => s.studentId === event.studentId)
            if (match) {
              extractedStudent = match
              break
            }
          }
          if (extractedStudent) break
        }

        const activeStudent = extractedStudent

        // 1. Remove student avatar from all previous locations in sidebar
        const updatedSidebar = prevData.sidebar.map((group) => ({
          ...group,
          children: group.children.map((loc) => {
            const hasInAvatars = loc.avatars.some((s) => s.studentId === event.studentId)
            const hasInRemaining = loc.remainingAvatars?.some((s) => s.studentId === event.studentId)

            if (hasInAvatars || hasInRemaining) {
              const newAvatars = loc.avatars.filter((s) => s.studentId !== event.studentId)
              const newRemaining = (loc.remainingAvatars || []).filter((s) => s.studentId !== event.studentId)
              return {
                ...loc,
                avatars: newAvatars,
                remainingAvatars: newRemaining,
                remainingAvatarCount: newRemaining.length,
                activeCount: Math.max(0, loc.activeCount - 1),
              }
            }
            return loc
          }),
        }))

        // 2. Add student avatar to the new target location
        const targetStudent: MonitoringStudent = {
          studentId: event.studentId || "",
          name: event.studentName || activeStudent?.name || "Mahasiswa",
          nim: event.nim || activeStudent?.nim || "",
          profilePhotoUrl: event.profilePhotoUrl !== undefined ? event.profilePhotoUrl : (activeStudent?.profilePhotoUrl || null),
          initials: event.initials || activeStudent?.initials || "?",
          status: activeStudent?.status || "SEDANG",
          lastUpdatedAt: event.lastActiveAt || new Date().toISOString(),
        }

        console.log("[POSITION][CLIENT] studentId:", event.studentId, "position:", event.sectionName || event.experimentId || event.exerciseId)
        console.log("[AVATAR][SOURCE] studentId:", targetStudent.studentId, "avatarUrl:", targetStudent.profilePhotoUrl)

        const finalSidebar = updatedSidebar.map((group) => ({
          ...group,
          children: group.children.map((loc) => {
            const isMatch = isSameLocation(loc, event)
            if (isMatch) {
              console.log("[SIDEBAR][MATCH] Matched location:", loc.title, "for event:", event.sectionName || event.experimentId)
              const exists = loc.avatars.some((s) => s.studentId === targetStudent.studentId)
              if (!exists) {
                const nextAvatars = [targetStudent, ...loc.avatars]
                const maxDisplay = 5
                const displayAvatars = nextAvatars.slice(0, maxDisplay)
                const remaining = nextAvatars.slice(maxDisplay)
                console.log("[AVATAR][RENDER] section:", loc.title, "studentId:", targetStudent.studentId, "avatar: RENDERED")
                return {
                  ...loc,
                  activeCount: loc.activeCount + 1,
                  avatars: displayAvatars,
                  remainingAvatars: remaining,
                  remainingAvatarCount: remaining.length,
                }
              }
            }
            return loc
          }),
        }))

        return {
          ...prevData,
          sidebar: finalSidebar,
          lastUpdatedAt: event.lastActiveAt || new Date().toISOString(),
        }
      })

      // 3. Update Detail view if matching
      setDetail((prevDetail) => {
        if (!prevDetail) return prevDetail

        const isCurrentLocation = isSameLocation(prevDetail.location, event)

        const updatedStudents = prevDetail.students.map((st) => {
          if (st.studentId === event.studentId) {
            return {
              ...st,
              locationStatus: isCurrentLocation ? ("active_here" as const) : ("elsewhere" as const),
              lastUpdatedAt: event.lastActiveAt || new Date().toISOString(),
            }
          }
          return st
        })

        const activeCount = updatedStudents.filter((s) => s.locationStatus === "active_here").length
        const completedCount = updatedStudents.filter((s) => s.locationStatus === "completed_here").length
        const notStartedCount = updatedStudents.filter((s) => s.locationStatus === "not_started_here").length
        const elsewhereCount = updatedStudents.filter((s) => s.locationStatus === "elsewhere").length

        return {
          ...prevDetail,
          students: updatedStudents,
          statistics: {
            activeCount,
            completedCount,
            notStartedCount,
            elsewhereCount,
          },
          lastUpdatedAt: event.lastActiveAt || new Date().toISOString(),
        }
      })
    }

    if (event.type === "student-run-count-updated") {
      if (!event.studentId || typeof event.runCount !== "number") return

      console.log(`[MONITORING-UI][RUN-COUNT-REALTIME] Updating run count for student ${event.studentId}: ${event.runCount}`)

      setDetail((prevDetail) => {
        if (!prevDetail) return prevDetail
        const updatedStudents = prevDetail.students.map((st) => {
          if (st.studentId === event.studentId) {
            return {
              ...st,
              runCount: event.runCount,
            }
          }
          return st
        })
        return {
          ...prevDetail,
          students: updatedStudents,
        }
      })

      setData((prevData) => {
        if (!prevData) return prevData
        const updatedSidebar = prevData.sidebar.map((group) => ({
          ...group,
          children: group.children.map((loc) => {
            if (isSameLocation(loc, event)) {
              return {
                ...loc,
                runningCount: (loc.runningCount || 0) + 1,
              }
            }
            return loc
          }),
        }))
        return {
          ...prevData,
          sidebar: updatedSidebar,
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!kelasPraktikumId) return undefined

    console.log("[Monitoring][SSE] connecting SSE stream for kelasPraktikumId:", kelasPraktikumId)
    const disconnect = connectMonitoringSse(
      kelasPraktikumId,
      (event) => {
        handleSseEvent(event)
      },
      (status) => {
        console.log("[Monitoring][SSE] stream status:", status)
      },
      () => {
        console.log("[Monitoring][SSE] reconnect snapshot trigger")
        loadMonitoring(true).catch(() => {})
      }
    )

    return () => {
      console.log("[Monitoring][SSE] disconnecting SSE stream for kelasPraktikumId:", kelasPraktikumId)
      disconnect()
    }
  }, [kelasPraktikumId, handleSseEvent, loadMonitoring])

  const openStudent = (studentId: string) => {
    const params = new URLSearchParams()
    params.set("attemptType", attemptType)
    if (remedialId) params.set("remedialId", remedialId)
    navigate(`/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/workpage?${params.toString()}`)
  }

  if (loading && !data) {
    return <div className="px-6 py-8 text-sm text-gray-500">Memuat monitoring kelas...</div>
  }

  if (!data) {
    return <div className="px-6 py-8 text-sm text-gray-500">Data monitoring belum tersedia.</div>
  }

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <BackButton
              onClick={() => {
                goBackToParent({
                  parentPath: jobsheetId ? `/jobsheets/${jobsheetId}` : "/mata-kuliah",
                  fallbackPath: "/mata-kuliah",
                  preserveQueryParams: ["courseId", "classId", "mataKuliahId", "kelasPraktikumId"],
                })
              }}
              className="mb-2"
            />
            <h1 className="truncate text-xl font-semibold text-gray-900">{data.context.jobsheetTitle}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{data.context.className}</span>
              <span>{data.context.academicPeriod}</span>
              <span>{data.summary.totalStudents} Mahasiswa</span>
              <span>{data.summary.inProgress} Sedang Mengerjakan</span>
              {Boolean(data.summary.runningCount) && (
                <span className="font-bold text-rose-600 animate-pulse">
                  &bull; {data.summary.runningCount} Program Running
                </span>
              )}
              <span>{data.summary.submittedManual + data.summary.submittedAutomatic} Dikumpulkan</span>
              <span>{data.summary.reviewed} Direview</span>
              <span>Terakhir diperbarui: {formatTime(data.lastUpdatedAt)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={remedialId ? `remedial:${remedialId}` : "normal"}
              onChange={(event) => {
                const value = event.target.value
                if (value === "normal") {
                  setAttemptType("normal")
                  setRemedialId(null)
                } else {
                  setAttemptType("remedial")
                  setRemedialId(value.replace("remedial:", ""))
                }
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {data.attempts.map((attempt) => (
                <option key={attempt.remedialId ?? "normal"} value={attempt.remedialId ? `remedial:${attempt.remedialId}` : "normal"}>
                  {attempt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadMonitoring(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          <div className="mx-auto max-w-5xl">
            {detail ? (
              <>
                <section className="rounded-md border border-gray-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{detail.location.moduleType}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-900">{detail.location.title}</h2>
                  <div className="mt-5">{renderInstruction(detail.location.instruction)}</div>
                </section>
                <ModuleStudents
                  detail={detail}
                  search={studentSearch}
                  status={studentStatus}
                  onSearch={setStudentSearch}
                  onStatus={setStudentStatus}
                  onOpenStudent={openStudent}
                />
              </>
            ) : (
              <div className="rounded-md border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
                Pilih modul pada sidebar untuk melihat isi jobsheet dan posisi mahasiswa.
              </div>
            )}
          </div>
        </main>

        <ModuleSidebar
          groups={data.sidebar}
          selected={selected}
          onSelect={(item) => {
            fetchLocation(item, true).catch((error) => {
              toast.error(error instanceof Error ? error.message : "Gagal memuat detail modul.")
            })
          }}
          onOpenStudent={openStudent}
        />
      </div>

      <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={!previousLocation}
            onClick={() => previousLocation && fetchLocation(previousLocation, true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate font-semibold text-gray-900">{selected?.title ?? "-"}</p>
            <p className="text-xs text-gray-500">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              {detail?.statistics.activeCount ?? 0} posisi terakhir tersimpan di modul ini
            </p>
          </div>
          <button
            type="button"
            disabled={!nextLocation}
            onClick={() => nextLocation && fetchLocation(nextLocation, true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>

      <LecturerChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false)
          setSelectedChatStudentId(null)
        }}
        kelasPraktikumId={kelasPraktikumId}
        jobsheetId={jobsheetId}
        studentId={selectedChatStudentId}
        onOpenChat={(targetStudentId) => {
          if (targetStudentId) {
            setSelectedChatStudentId(targetStudentId)
          }
          setIsChatOpen(true)
        }}
      />
    </div>
  )
}
