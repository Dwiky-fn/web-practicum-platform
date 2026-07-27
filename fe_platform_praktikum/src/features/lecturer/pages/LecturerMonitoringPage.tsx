import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import StudentProfileModal from "../components/StudentProfileModal"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { formatAcademicDateTime } from "../../../shared/utils/formatAcademicDateTime"
import {
  LecturerEmptyState,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  SearchBox,
  StatCard,
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

      const status = resolveActivityStatus(event.lastActiveAt || null, current.inactiveThresholdMinutes)
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
        activityStatus: status.status,
        activityStatusLabel: status.label,
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
    <LecturerLayout>
      <PageHeader
        title="Monitoring Praktikum"
        subtitle="Pantau aktivitas pengerjaan mahasiswa berdasarkan kelas dan jobsheet."
      />
      <p className="mb-4 text-xs font-medium text-gray-500">
        WebSocket monitoring: {socketStatus === "connected" ? "Terhubung" : socketStatus === "connecting" ? "Menghubungkan" : "Terputus"}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!courseGroups.length ? (
        <LecturerEmptyState title="Belum ada kelas yang bisa dimonitor." />
      ) : (
        <>
          <LecturerPanel className="mb-6 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <NativeSelect
                value={courseId}
                onChange={(value) => {
                  const nextCourse = courseGroups.find((item) => item.id === value)
                  setCourseId(value)
                  setClassId(nextCourse?.classes[0]?.id || "")
                }}
                label="Mata kuliah"
                className="w-full"
              >
                {courseGroups.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={classId} onChange={(value) => {
                setClassId(value)
              }} label="Kelas Praktikum" className="w-full">
                {(selectedCourse?.classes ?? []).map((item) => (
                  <option key={item.id} value={item.id}>Kelas Praktikum {item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={status} onChange={setStatus} label="Status" className="w-full">
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="not_started">Belum Memulai</option>
              </NativeSelect>
            </div>
          </LecturerPanel>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Mahasiswa" value={studentCount} />
            <StatCard label="Aktif" value={activeCount} />
            <StatCard label="Tidak Aktif" value={inactiveCount} />
            <StatCard label="Belum Memulai" value={notStartedCount} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Insight Praktikum</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>{activeCount} mahasiswa masih aktif berdasarkan batas durasi.</li>
                <li>{inactiveCount} mahasiswa tidak aktif melebihi batas durasi.</li>
                <li>{notStartedCount} mahasiswa belum memiliki aktivitas tersimpan.</li>
              </ul>
            </LecturerPanel>

            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Aktivitas Terbaru</h2>
              {!latestActivities.length ? (
                <p className="text-sm text-gray-500">Belum ada aktivitas submission untuk filter ini.</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  {latestActivities.map((item) => (
                    <li key={item.studentId}>
                      {item.name} aktif pada {item.currentJobsheet?.name ?? "Jobsheet"} - {item.currentSection?.name ?? "Bagian"} pada {formatAcademicDateTime(item.lastActiveAt)}
                    </li>
                  ))}
                </ul>
              )}
            </LecturerPanel>
          </section>

          <LecturerPanel className="mt-6 p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">Daftar Mahasiswa</h2>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" className="w-full md:w-auto" />
            </div>

            {!visibleRows.length ? (
              <LecturerEmptyState title="Tidak ada data mahasiswa untuk filter monitoring ini." />
            ) : (
              <LecturerTable headers={["NIM", "Nama", "Status", "Jobsheet", "Bagian", "Terakhir Aktif", "Durasi", "Run Code", "Batas", "Aksi"]}>
                {visibleRows.map((item) => (
                  <tr key={item.studentId}>
                    <td className="px-4 py-3 font-mono">{item.nim}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentProfileId(item.studentId)}
                        className="font-medium text-blue-700 hover:text-blue-900 hover:underline text-left focus:outline-none"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">{item.activityStatusLabel}</td>
                    <td className="px-4 py-3 text-center">{item.currentJobsheet ? `Jobsheet ${item.currentJobsheet.urutan ?? "-"} - ${item.currentJobsheet.name}` : "Belum Memulai"}</td>
                    <td className="px-4 py-3 text-center">{item.currentSection?.name ?? "Belum Memulai"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.lastActiveAt ? formatAcademicDateTime(item.lastActiveAt) : "Belum ada aktivitas."}
                    </td>
                    <td className="px-4 py-3 text-center">{item.inactiveDurationLabel}</td>
                    <td className="px-4 py-3 text-center">{item.runCount} kali</td>
                    <td className="px-4 py-3 text-center">{item.inactiveThresholdMinutes} menit ({item.inactiveThresholdSource})</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={!item.currentJobsheet?.id}
                        onClick={() => {
                          if (!item.currentJobsheet?.id) return
                          const kelasPraktikumId = selectedScope.kelasPraktikumId || classId
                          navigate(`/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${item.currentJobsheet.id}/students/${item.studentId}/monitor`)
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Lihat Live Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </LecturerTable>
            )}
          </LecturerPanel>
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
