import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useParams, useNavigate, Outlet } from "react-router-dom"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { toast } from "../../../components/toast/toastStore"
import { getStudentMonitoringWorkpage, type WorkpageResponse } from "../../../services/lecturerMonitoring"
import { getLecturerJobsheetById } from "../service"
import WorkSidebar from "../../student/jobsheets/work/components/sidebar/WorkSidebar"
import WorkFooterNav from "../../student/jobsheets/work/components/WorkFooterNav"
import type { StudentProgressItem, StudentProgressItemType } from "../../../services/progress/types"
import type { JobsheetSubmission, SubmissionStatus } from "../../../services/submission/types"
import type { Jobsheet } from "../../../services/jobsheet/types"
import type { Course } from "../../../services/course/types"
import { getCourseById } from "../../../services/course/service"
import type { JSONContent } from "@tiptap/react"

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + " " + date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function getStatusKeterangan(status: string) {
  if (status === "Dikumpulkan Otomatis") {
    return "Dikumpulkan otomatis setelah deadline."
  }
  if (status === "Belum Memulai") {
    return "Belum ada aktivitas pengerjaan yang tersimpan."
  }
  return null
}

export default function LecturerStudentWorkpagePage() {
  const { kelasPraktikumId = "", jobsheetId = "", studentId = "" } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const courseId = params.get("courseId") ?? ""
  const classId = params.get("classId") ?? ""
  const mataKuliahId = params.get("mataKuliahId") ?? undefined
  const attemptType = params.get("attemptType") || "normal"
  const remedialId = params.get("remedialId")

  const [data, setData] = useState<WorkpageResponse | null>(null)
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const scrollContainerRef = useRef<HTMLElement | null>(null)

  const activeItem = useMemo(() => {
    const parts = location.pathname.split("/")
    const monitorIdx = parts.indexOf("monitor")
    if (monitorIdx !== -1 && monitorIdx < parts.length - 1) {
      const type = parts[monitorIdx + 1]
      const id = parts[monitorIdx + 2]
      return { type, id }
    }
    return null
  }, [location.pathname])

  const isAtRoot = location.pathname.endsWith("/monitor") || location.pathname.endsWith("/monitor/")

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const scope = { mataKuliahId, kelasPraktikumId }
      const nextData = await getStudentMonitoringWorkpage(
        kelasPraktikumId,
        jobsheetId,
        studentId,
        attemptType,
        remedialId,
        activeItem?.type,
        activeItem?.id
      )
      setData(nextData)

      const nextJobsheet = await getLecturerJobsheetById(courseId || nextData.context.kelasPraktikumId, jobsheetId, scope)
      setJobsheet(nextJobsheet)

      const targetCourseId = courseId || nextJobsheet.courseId
      if (targetCourseId) {
        const nextCourse = await getCourseById(targetCourseId)
        setCourse(nextCourse)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data monitoring.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [attemptType, jobsheetId, kelasPraktikumId, remedialId, studentId, courseId, mataKuliahId, activeItem])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [attemptType, remedialId])

  useEffect(() => {
    if (!loading) {
      loadData(true)
    }
  }, [activeItem, loadData, loading])

  // Polling data every 30 seconds if page/tab is active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(true)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !refreshing) {
        loadData(true)
      }
    }, 30000)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [loadData, refreshing])

  // Auto navigate to student's last active location when loaded at monitor root
  useEffect(() => {
    if (!data || !isAtRoot) return

    let subpath = ""
    const curr = data.progress.currentLocation
    if (curr) {
      if (curr.moduleType === "theory") {
        subpath = `theory/${curr.moduleId}`
      } else if (curr.moduleType === "experiment") {
        subpath = `experiments/${curr.moduleId}`
      } else if (curr.moduleType === "exercise") {
        subpath = `exercises/${curr.moduleId}`
      }
    } else {
      // Find the first available item in the structure
      const firstChild = data.structure
        .flatMap((g) => g.children)
        .filter(Boolean)[0]

      if (firstChild) {
        const type = firstChild.moduleType
        if (type === "theory") {
          subpath = `theory/${firstChild.moduleId}`
        } else if (type === "experiment") {
          subpath = `experiments/${firstChild.moduleId}`
        } else if (type === "exercise") {
          subpath = `exercises/${firstChild.moduleId}`
        }
      }
    }

    if (!subpath) {
      subpath = "task"
    }

    navigate(`./${subpath}${location.search}`, { replace: true })
  }, [data, isAtRoot, navigate, location.search])

  const handleWorkScroll = useCallback(() => {
    // Read-only monitoring mode
  }, [])

  const completedItems: StudentProgressItem[] = useMemo(() => {
    if (!data) return []
    return (data.progress.completedItems ?? []).map((item) => ({
      type: item.type as StudentProgressItemType,
      id: item.id,
      completedAt: item.completedAt ?? new Date().toISOString(),
    }))
  }, [data])

  const mockSubmission = useMemo((): JobsheetSubmission | null => {
    if (!data) return null
    return {
      id: data.submission.id ?? "",
      jobsheetId: jobsheetId,
      studentId: studentId,
      status: (data.submission.status as SubmissionStatus) ?? "DRAFT",
      score: data.submission.finalScore ?? undefined,
      isAutoSubmitted: data.submission.isAutoSubmitted,
      submittedAt: data.submission.submittedAt,
      calculatedProgressScore: data.submission.progressScore?.progressScore ?? null,
      scoreBreakdown: data.submission.progressScore
        ? {
            progressScore: data.submission.progressScore.progressScore ?? 0,
            totalWeight: 0,
            completedWeight: 0,
            items: (data.submission.progressScore.items ?? []) as any[],
          }
        : null,
      report: {
        experiments: Object.fromEntries(
          Object.entries(data.submission.report?.experiments ?? {}).map(([key, exp]) => [
            key,
            {
              steps: (exp?.steps ?? []).map((step) => ({
                files: step.files ?? {},
                output: step.output ?? "",
                analysis: (step.analysis && typeof step.analysis === "object" ? step.analysis : { type: "doc", content: [] }) as JSONContent,
              })),
            },
          ])
        ),
        exercises: Object.fromEntries(
          Object.entries(data.submission.report?.exercises ?? {}).map(([key, ex]) => [
            key,
            {
              files: ex?.files ?? {},
              output: ex?.output ?? "",
              analysis: (ex?.analysis && typeof ex?.analysis === "object" ? ex?.analysis : { type: "doc", content: [] }) as JSONContent,
            },
          ])
        ),
        conclusion: data.submission.report?.conclusion ? (data.submission.report.conclusion as any) : null,
      },
      experiments: [],
      exercises: [],
      updatedAt: data.lastUpdatedAt ?? new Date().toISOString(),
    }
  }, [data, jobsheetId, studentId])

  const lastPositionItem = useMemo(() => {
    if (!data || !jobsheet) return null
    const curr = data.progress.currentLocation
    if (!curr) return null

    let label = "Posisi Terakhir"
    if (curr.moduleType === "experiment") {
      const expGroup = data.structure.find((g) => g.id === `experiment-${curr.moduleId}`)
      const totalSteps = expGroup?.children?.length || 1
      const stepNum = (curr.stepIndex ?? 0) + 1
      label = `Posisi Terakhir\nLangkah ${stepNum} dari ${totalSteps}`
    }

    return {
      type: curr.moduleType,
      id: curr.moduleId,
      label,
    }
  }, [data, jobsheet])

  if (loading && !data) {
    return <div className="px-6 py-8 text-sm text-gray-500">Memuat workpage monitoring...</div>
  }

  if (!data || !jobsheet) {
    return <div className="px-6 py-8 text-sm text-gray-500">Data pengerjaan mahasiswa belum tersedia.</div>
  }

  const targetCourseId = courseId || jobsheet?.courseId || ""
  const targetClassId = classId || kelasPraktikumId || ""
  const savedTab = sessionStorage.getItem(`activeTab_jobsheet_${jobsheetId}`) || "monitoring"
  const monitoringPath = `/jobsheets/${jobsheetId}?tab=${savedTab}&classId=${targetClassId}&courseId=${targetCourseId}${mataKuliahId ? `&mataKuliahId=${mataKuliahId}` : ""}${kelasPraktikumId ? `&kelasPraktikumId=${kelasPraktikumId}` : ""}`
  const basePath = `/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor`
  const scope = {
    classId: targetClassId,
    mataKuliahId,
    kelasPraktikumId,
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50 font-sans">
      {/* Monitoring Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-5 shrink-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={monitoringPath}
              className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition duration-150"
              title="Kembali ke Monitoring Mahasiswa"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                  Mode Monitoring Dosen
                </span>
                {remedialId && (
                  <span className="text-xs font-semibold text-amber-600 tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                    Remedial Sesi
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl font-bold text-gray-900 flex items-center gap-3">
                {data.student.name}
                <span className="text-xs font-mono font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  NIM: {data.student.nim}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data.attempts && data.attempts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Pengerjaan yang Ditampilkan:</span>
                <select
                  value={remedialId ? `remedial:${remedialId}` : "normal"}
                  onChange={(e) => {
                    const val = e.target.value
                    const nextParams = new URLSearchParams(location.search)
                    if (val === "normal") {
                      nextParams.set("attemptType", "normal")
                      nextParams.delete("remedialId")
                    } else {
                      nextParams.set("attemptType", "remedial")
                      nextParams.set("remedialId", val.replace("remedial:", ""))
                    }
                    navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true })
                  }}
                  className="bg-white border border-gray-300 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700 shadow-sm transition"
                >
                  {data.attempts.map((attempt) => (
                    <option key={attempt.remedialId ?? "normal"} value={attempt.remedialId ? `remedial:${attempt.remedialId}` : "normal"}>
                      {attempt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => loadData()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Monitoring Info Bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 border-t border-gray-100 pt-4 text-sm text-gray-700">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Status</span>
            <span className="font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${
                data.status === "Selesai" || data.status === "Direview" ? "bg-emerald-500" :
                data.status === "Belum Memulai" ? "bg-gray-400" : "bg-blue-500"
              }`} />
              {data.status}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Posisi Terakhir</span>
            <span className="font-medium text-gray-800 block mt-0.5 truncate" title={data.progress.currentLocation?.title || "Belum Memulai"}>
              {data.progress.currentLocation?.title || "Belum Memulai"}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Terakhir diperbarui</span>
            <span className="font-medium text-gray-800 block mt-0.5">
              {formatDateTime(data.lastUpdatedAt)}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Jumlah Run Kode</span>
            <span className="font-semibold text-gray-800 block mt-0.5">
              {data.monitoringStats?.runCount ?? 0} kali
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Tidak Ada Aktivitas Selama</span>
            <span className="font-medium block mt-0.5">
              {!data.monitoringStats?.hasActivity ? (
                <span className="text-gray-500 italic">Belum ada aktivitas</span>
              ) : data.monitoringStats?.inactiveDurationSeconds !== null && data.monitoringStats.inactiveDurationSeconds <= 600 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif baru-baru ini
                </span>
              ) : (
                <span className="text-gray-800">
                  {data.monitoringStats?.inactiveLabel}
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Kemajuan Pengerjaan</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[120px] overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, data.progress.progressPercentage || 0))}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-600">{Math.round(data.progress.progressPercentage || 0)}%</span>
            </div>
          </div>
        </div>

        {/* Optional Status Explanation */}
        {getStatusKeterangan(data.status) && (
          <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{getStatusKeterangan(data.status)}</span>
          </div>
        )}
      </header>

      {/* Main Content & Sidebar */}
      <div className="flex flex-1 relative overflow-hidden">
        <main
          ref={scrollContainerRef}
          data-work-scroll
          onScroll={handleWorkScroll}
          className="flex-1 overflow-y-auto px-6 py-8 lg:px-10"
        >
          <div className="mx-auto max-w-6xl">
            {mockSubmission && (
              <Outlet
                context={{
                  course,
                  jobsheet,
                  submission: mockSubmission,
                  programmingLanguage: jobsheet.programmingLanguage || course?.programmingLanguage || "java",
                  updateExperiment: () => Promise.resolve(),
                  updateExercise: () => Promise.resolve(),
                  trackActivity: () => Promise.resolve(),
                  readOnly: true,
                }}
              />
            )}
          </div>
        </main>

        {mockSubmission && (
          <WorkSidebar
            courseId={courseId}
            jobsheet={jobsheet}
            submission={mockSubmission}
            savedProgress={data.progress.progressPercentage}
            completedItems={completedItems}
            scope={scope}
            basePath={basePath}
            lastPositionItem={lastPositionItem}
          />
        )}
      </div>

      {mockSubmission && (
        <WorkFooterNav
          courseId={courseId}
          jobsheet={jobsheet}
          submission={mockSubmission}
          savedProgress={data.progress.progressPercentage}
          completedItems={completedItems}
          scope={scope}
          basePath={basePath}
        />
      )}
    </div>
  )
}
