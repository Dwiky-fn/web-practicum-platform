import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Activity, Clock, Eye, Radio, Sparkles, UserCheck, Users, UserX } from "lucide-react"
import StudentProfileModal from "../components/StudentProfileModal"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { formatAcademicDateTime } from "../../../shared/utils/formatAcademicDateTime"
import {
  LecturerEmptyState,
  LecturerTable,
  NativeSelect,
  PageHeader,
  SearchBox,
} from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerClassMonitoring,
  getLecturerCourseGroups,
  type LecturerClassMonitoringStudent,
  type LecturerCourseGroup,
} from "../service"
import { connectMonitoringSocket } from "../../../services/monitoringSocket"
import type { MonitoringSocketEvent } from "../../../services/monitoringSocket"

function formatDurationFromNow(value?: string | null) {
  if (!value) return "Belum ada aktivitas"
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return "Belum ada aktivitas"
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (minutes < 1) return "Baru saja"
  if (minutes < 60) return `${minutes} menit yang lalu`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return remainingMinutes ? `${hours} jam ${remainingMinutes} menit yang lalu` : `${hours} jam yang lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari yang lalu`
}

function resolveActivityStatus(lastActiveAt: string | null, thresholdMinutes: number) {
  if (!lastActiveAt) return { status: "not_started" as const, label: "Belum Memulai" }
  const time = new Date(lastActiveAt).getTime()
  if (Number.isNaN(time)) return { status: "not_started" as const, label: "Belum Memulai" }
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  return minutes <= thresholdMinutes
    ? { status: "active" as const, label: "Aktif" }
    : { status: "inactive" as const, label: "Tidak Aktif" }
}

export default function LecturerMonitoringPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [courseGroups, setCourseGroups] = useState<LecturerCourseGroup[]>([])
  const [courseId, setCourseId] = useState("")
  const [classId, setClassId] = useState("")
  const [status, setStatus] = useState("all")
  const [keyword, setKeyword] = useState("")
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [rows, setRows] = useState<LecturerClassMonitoringStudent[]>([])
  const [socketStatus, setSocketStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected")
  const [clockTick, setClockTick] = useState(0)

  const selectedCourse = courseGroups.find((item) => item.id === courseId) ?? null
  const selectedClass = selectedCourse?.classes.find((item) => item.id === classId) ?? null
  const selectedScope = {
    mataKuliahId: selectedCourse?.mataKuliahId || selectedCourse?.id,
    kelasPraktikumId: selectedClass?.kelasPraktikumId || selectedClass?.id_kelas_praktikum,
  }

  useEffect(() => {
    async function loadCourses() {
      if (!user || user.role !== "DOSEN") return

      setLoading(true)
      setError("")

      try {
        const groups = await getLecturerCourseGroups()
        setCourseGroups(groups)

        if (groups.length > 0) {
          setCourseId((current) => current || groups[0].id)
          setClassId((current) => current || groups[0].classes[0]?.id || "")
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat monitoring dosen.")
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [user])

  useEffect(() => {
    if (!selectedCourse) return

    const exists = selectedCourse.classes.some((item) => item.id === classId)
    if (!exists) {
      setClassId(selectedCourse.classes[0]?.id || "")
    }
  }, [classId, selectedCourse])

  const loadClassData = useCallback(async () => {
    if (!classId) return

    setLoading(true)
    setError("")

    try {
      const classDetail = await getLecturerClassDetail(classId)
      const kelasPraktikumId = classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum || selectedScope.kelasPraktikumId
      const monitoring = await getLecturerClassMonitoring(kelasPraktikumId || classId)

      setStudentCount(classDetail.students.length)
      setRows(monitoring.students)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat data monitoring kelas.")
    } finally {
      setLoading(false)
    }
  }, [classId, selectedScope.kelasPraktikumId])

  useEffect(() => {
    setRows([])
    setStudentCount(0)
    loadClassData()
  }, [loadClassData])

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const applyMonitoringEvent = useCallback((event: MonitoringSocketEvent) => {
    const activeKelasPraktikumId = selectedScope.kelasPraktikumId || classId
    if (event.type !== "student-monitoring-updated") return
    if (!event.kelasPraktikumId || event.kelasPraktikumId !== activeKelasPraktikumId) return

    setRows((currentRows) => {
      const existingIndex = currentRows.findIndex((item) => item.studentId === event.studentId)
      if (existingIndex < 0) {
        loadClassData()
        return currentRows
      }

      const current = currentRows[existingIndex]
      const currentTime = current.lastActiveAt ? new Date(current.lastActiveAt).getTime() : 0
      const eventTime = event.lastActiveAt ? new Date(event.lastActiveAt).getTime() : 0
      if (!eventTime || eventTime < currentTime) return currentRows

      const statusInfo = resolveActivityStatus(event.lastActiveAt || null, current.inactiveThresholdMinutes)
      const nextRows = [...currentRows]
      nextRows[existingIndex] = {
        ...current,
        currentJobsheet: event.jobsheetId
          ? {
              id: event.jobsheetId,
              name: event.jobsheetName || current.currentJobsheet?.name || "Jobsheet",
              urutan: event.jobsheetSequence ?? (current.currentJobsheet?.id === event.jobsheetId ? current.currentJobsheet.urutan : current.currentJobsheet?.urutan),
            }
          : current.currentJobsheet,
        currentSection: event.sectionType
          ? {
              type: event.sectionType,
              id: event.sectionId,
              name: event.sectionName || current.currentSection?.name || "Bagian",
            }
          : current.currentSection,
        lastActiveAt: event.lastActiveAt || current.lastActiveAt,
        inactiveDurationMinutes: event.lastActiveAt ? Math.max(0, Math.floor((Date.now() - eventTime) / 60000)) : current.inactiveDurationMinutes,
        inactiveDurationLabel: formatDurationFromNow(event.lastActiveAt || current.lastActiveAt),
        activityStatus: statusInfo.status,
        activityStatusLabel: statusInfo.label,
        runCount: typeof event.runCount === "number" ? event.runCount : current.runCount,
      }
      return nextRows
    })
  }, [classId, loadClassData, selectedScope.kelasPraktikumId])

  useEffect(() => {
    const kelasPraktikumId = selectedScope.kelasPraktikumId || classId
    if (!kelasPraktikumId) return undefined

    return connectMonitoringSocket(
      kelasPraktikumId,
      applyMonitoringEvent,
      setSocketStatus,
      loadClassData,
    )
  }, [applyMonitoringEvent, classId, loadClassData, selectedScope.kelasPraktikumId])

  const liveRows = useMemo(
    () => rows.map((item) => {
      const statusInfo = resolveActivityStatus(item.lastActiveAt, item.inactiveThresholdMinutes)
      return {
        ...item,
        inactiveDurationLabel: formatDurationFromNow(item.lastActiveAt),
        activityStatus: statusInfo.status,
        activityStatusLabel: statusInfo.label,
      }
    }),
    [clockTick, rows],
  )

  const visibleRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return liveRows.filter((item) => {
      const matchKeyword =
        !normalized ||
        [item.nim, item.name].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = status === "all" || item.activityStatus === status

      return matchKeyword && matchStatus
    })
  }, [keyword, liveRows, status])

  const activeCount = visibleRows.filter((item) => item.activityStatus === "active").length
  const inactiveCount = visibleRows.filter((item) => item.activityStatus === "inactive").length
  const notStartedCount = visibleRows.filter((item) => item.activityStatus === "not_started").length
  const latestActivities = visibleRows
    .filter((item) => item.lastActiveAt)
    .sort((left, right) => {
      const leftTime = new Date(left.lastActiveAt ?? 0).getTime()
      const rightTime = new Date(right.lastActiveAt ?? 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, 5)

  if (loading && !courseGroups.length) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout
      backTo={
        selectedScope.classId && selectedScope.courseId
          ? `/kelas-praktikum/${selectedScope.courseId}/${selectedScope.classId}`
          : "/mata-kuliah"
      }
    >
      <PageHeader
        title="Monitoring Praktikum Real-Time"
        subtitle="Pantau aktivitas pengerjaan koding dan progres live mahasiswa saat praktikum."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!courseGroups.length ? (
        <LecturerEmptyState title="Belum ada kelas yang bisa dimonitor." />
      ) : (
        <>
          {/* Header Banner Monitoring dengan Socket Badge */}
          <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                  <Sparkles size={16} className="text-yellow-400" />
                  Live Monitoring Session
                </div>
                <h2 className="mt-1 text-xl font-bold text-white">
                  {selectedCourse?.name ?? "Mata Kuliah"} &bull; Kelas {selectedClass?.name ?? "-"}
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Real-time telemetry pengerjaan koding &amp; log eksekusi mahasiswa.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                <Radio
                  size={16}
                  className={`animate-pulse ${
                    socketStatus === "connected"
                      ? "text-emerald-400"
                      : socketStatus === "connecting"
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wide text-white">
                  {socketStatus === "connected"
                    ? "Live Terhubung"
                    : socketStatus === "connecting"
                    ? "Menghubungkan..."
                    : "Terputus"}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Bar Filter Panel */}
          <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NativeSelect
                value={courseId}
                onChange={(value) => {
                  const nextCourse = courseGroups.find((item) => item.id === value)
                  setCourseId(value)
                  setClassId(nextCourse?.classes[0]?.id || "")
                }}
                label="Pilih Mata Kuliah"
                className="w-full text-gray-900"
              >
                {courseGroups.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>

              <NativeSelect
                value={classId}
                onChange={(value) => setClassId(value)}
                label="Pilih Kelas Praktikum"
                className="w-full text-gray-900"
              >
                {(selectedCourse?.classes ?? []).map((item) => (
                  <option key={item.id} value={item.id}>Kelas {item.name}</option>
                ))}
              </NativeSelect>

              <NativeSelect
                value={status}
                onChange={setStatus}
                label="Filter Status Aktivitas"
                className="w-full text-gray-900"
              >
                <option value="all">Semua Status Mahasiswa</option>
                <option value="active">Aktif Bekerja</option>
                <option value="inactive">Tidak Aktif (Inaktif)</option>
                <option value="not_started">Belum Memulai</option>
              </NativeSelect>
            </div>
          </div>

          {/* Grid Stat Cards */}
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Mahasiswa</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Users size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">{studentCount} Orang</p>
              <p className="mt-1 text-xs text-gray-500">Terdaftar di kelas {selectedClass?.name ?? "-"}</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Aktif Koding</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <UserCheck size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">{activeCount} Orang</p>
              <p className="mt-1 text-xs text-gray-500">Sedang mengerjakan dalam batas waktu</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Tidak Aktif</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <UserX size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">{inactiveCount} Orang</p>
              <p className="mt-1 text-xs text-gray-500">Melebihi batas durasi inaktif</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Belum Memulai</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Clock size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">{notStartedCount} Orang</p>
              <p className="mt-1 text-xs text-gray-500">Belum ada aktivitas tercatat</p>
            </div>
          </section>

          {/* Grid Panel Insights & Aktivitas Terbaru */}
          <section className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" /> Insight Praktikum Kelas
              </h2>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span><strong>{activeCount}</strong> mahasiswa aktif bekerja sesuai alokasi durasi.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span><strong>{inactiveCount}</strong> mahasiswa idle / tidak melakukan aktivitas melebihi batas.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span><strong>{notStartedCount}</strong> mahasiswa belum membuka workspace.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-purple-600" /> Aktivitas Terakhir Mahasiswa
              </h2>
              {!latestActivities.length ? (
                <p className="py-4 text-sm text-gray-500">Belum ada aktivitas untuk kelas ini.</p>
              ) : (
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {latestActivities.map((item) => (
                    <li key={item.studentId} className="flex items-center justify-between border-b border-gray-50 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{item.name}</span>
                        <span className="ml-2 text-gray-500">({item.currentJobsheet?.name ?? "Jobsheet"} - {item.currentSection?.name ?? "Bagian"})</span>
                      </div>
                      <span className="font-medium text-blue-700">{formatDurationFromNow(item.lastActiveAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Table Utama Monitoring Mahasiswa */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Daftar Mahasiswa &amp; Status Telemetri</h2>
                <p className="text-xs text-gray-500">
                  Klik nama mahasiswa untuk melihat profil detail atau tombol "Live Workspace" untuk memantau layar koding.
                </p>
              </div>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Nama / NIM..." className="w-full md:w-72" />
            </div>

            {!visibleRows.length ? (
              <LecturerEmptyState title="Tidak ada data mahasiswa untuk filter monitoring ini." />
            ) : (
              <LecturerTable headers={["NIM", "Nama Mahasiswa", "Status", "Jobsheet Active", "Bagian Terakhir", "Aktivitas Terakhir", "Durasi Inaktif", "Run Code", "Aksi Live"]}>
                {visibleRows.map((item) => {
                  const statusBadgeClass =
                    item.activityStatus === "active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : item.activityStatus === "inactive"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"

                  return (
                    <tr key={item.studentId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{item.nim}</td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentProfileId(item.studentId)}
                          className="font-bold text-blue-700 hover:text-blue-900 hover:underline text-left focus:outline-none"
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass}`}>
                          {item.activityStatusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs font-medium text-gray-800">
                        {item.currentJobsheet ? `Jobsheet ${item.currentJobsheet.urutan ?? "-"} - ${item.currentJobsheet.name}` : "Belum Memulai"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-gray-600">
                        {item.currentSection?.name ?? "Belum Memulai"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-gray-600">
                        {item.lastActiveAt ? formatAcademicDateTime(item.lastActiveAt) : "Belum ada aktivitas"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-blue-700">
                        {item.inactiveDurationLabel}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs font-mono font-bold text-gray-800">
                        {item.runCount} kali
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          disabled={!item.currentJobsheet?.id}
                          onClick={() => {
                            if (!item.currentJobsheet?.id) return
                            const kelasPraktikumId = selectedScope.kelasPraktikumId || classId
                            navigate(`/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${item.currentJobsheet.id}/students/${item.studentId}/monitor`)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                        >
                          <Eye size={14} /> Live Workspace
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </LecturerTable>
            )}
          </div>
        </>
      )}

      {selectedStudentProfileId && (
        <StudentProfileModal
          studentId={selectedStudentProfileId}
          onClose={() => setSelectedStudentProfileId(null)}
        />
      )}
    </LecturerLayout>
  )
}
