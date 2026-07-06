import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { ExternalLink, RefreshCw, User, MapPin, Activity, Settings } from "lucide-react"
import type { JSONContent } from "@tiptap/react"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import { toast } from "../../../components/toast/toastStore"
import WorkHeader from "../../student/jobsheets/work/components/WorkHeader"
import WorkFooterNav from "../../student/jobsheets/work/components/WorkFooterNav"
import WorkSidebar from "../../student/jobsheets/work/components/sidebar/WorkSidebar"
import InstructionWorkspaceCard from "../../student/jobsheets/work/content/practice/components/InstructionWorkspaceCard"
import { buildWorkNavigation } from "../../student/jobsheets/work/utils/buildNavigation"
import { getStudentMonitoringWorkpage, type MonitoringGroup, type MonitoringLocation, type WorkpageResponse } from "../../../services/lecturerMonitoring"
import type { Course } from "../../../services/course/types"
import type { Jobsheet } from "../../../services/jobsheet/types"
import type { StudentProgressItem } from "../../../services/progress/types"
import type { JobsheetSubmission } from "../../../services/submission/types"
import { formatAcademicDateTime, formatAcademicTime } from "../../../shared/utils/formatAcademicDateTime"

const EMPTY_DOC: JSONContent = { type: "doc", content: [] }

function formatDate(value?: string | null) {
  if (!value) return "-"
  return formatAcademicDateTime(value)
}

function formatClock(value?: string | null) {
  if (!value) return "-"
  return formatAcademicTime(value)
}

function renderStatusBadge(status: string) {
  let bg = "bg-gray-100 text-gray-800 border-gray-200"
  if (status === "Direview") {
    bg = "bg-purple-50 text-purple-700 border-purple-200"
  } else if (status === "Dikumpulkan Otomatis" || status === "Dikumpulkan Manual") {
    bg = "bg-emerald-50 text-emerald-700 border-emerald-200"
  } else if (status === "Sedang Mengerjakan") {
    bg = "bg-amber-50 text-amber-700 border-amber-200"
  } else if (status === "Belum Memulai") {
    bg = "bg-gray-50 text-gray-600 border-gray-200"
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${bg}`}>
      {status}
    </span>
  )
}

function renderStuckValue(stats?: {
  runCount: number
  lastMeaningfulActivityAt: string | null
  inactiveDurationSeconds: number | null
  inactiveLabel: string
  hasActivity: boolean
}) {
  if (!stats || !stats.hasActivity || stats.inactiveDurationSeconds === null) {
    return (
      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
        Belum terdeteksi stuck
      </span>
    )
  }
  if (stats.inactiveDurationSeconds < 600) {
    return (
      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
        Aktif
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
      Stuck: {stats.inactiveLabel}
    </span>
  )
}

function toDoc(value: unknown): JSONContent {
  if (value && typeof value === "object" && "type" in value) return value as JSONContent
  if (typeof value === "string" && value.trim()) {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] }
  }
  return EMPTY_DOC
}

function normalizeReadonlySteps(
  steps: Array<{ files?: Record<string, string>; output?: string; analysis?: unknown }> = [],
) {
  return steps.map((step) => ({
    files: step.files ?? {},
    output: step.output ?? "",
    analysis: toDoc(step.analysis),
  }))
}

function hasSavedWorkspace(steps: Array<{ files?: Record<string, string>; output?: string; analysis?: unknown }>) {
  return steps.some((step) => (
    Object.values(step.files ?? {}).some((code) => code.trim().length > 0) ||
    Boolean(step.output?.trim()) ||
    JSON.stringify(step.analysis ?? {}).replace(/\s/g, "").length > 20
  ))
}

function groupById(groups: MonitoringGroup[], id: string) {
  return groups.find((group) => group.id === id || group.id === `experiment-${id}`)
}

function firstModulePath(basePath: string, jobsheet: Jobsheet, query: string) {
  const first = buildWorkNavigation("monitoring", jobsheet, query, undefined, basePath)[0]
  return first?.path ?? `${basePath}${query}`
}

function targetPathFromLocation(basePath: string, data: WorkpageResponse, jobsheet: Jobsheet, query: string) {
  const location = data.progress.currentLocation
  if (!location) return firstModulePath(basePath, jobsheet, query)
  if (location.moduleType === "theory") return `${basePath}/theory/${location.moduleId}${query}`
  if (location.moduleType === "experiment") return `${basePath}/experiments/${location.moduleId}${query}`
  if (location.moduleType === "exercise") return `${basePath}/exercises/${location.moduleId}${query}`
  return firstModulePath(basePath, jobsheet, query)
}

function buildJobsheet(data: WorkpageResponse): Jobsheet {
  const theoryGroup = groupById(data.structure, "theory")
  const exerciseGroup = groupById(data.structure, "exercise")
  const experimentGroups = data.structure.filter((group) => group.id.startsWith("experiment-"))

  return {
    id: data.context.jobsheetId,
    courseId: "monitoring",
    status: "PUBLISHED",
    programmingLanguage: data.context.programmingLanguage,
    programmingLanguageDisplayName: data.context.programmingLanguage,
    editorMode: "mini_ide",
    title: data.context.jobsheetTitle,
    description: "",
    summary: EMPTY_DOC,
    goal: "",
    deadline: "",
    theory: (theoryGroup?.children ?? []).map((item, index) => ({
      id: item.moduleId,
      order: index + 1,
      title: item.title,
      content: toDoc(item.instruction),
      rubric: 0,
    })),
    experiments: experimentGroups.map((group, index) => ({
      id: group.children[0]?.moduleId ?? group.id.replace(/^experiment-/, ""),
      order: index + 1,
      title: group.title,
      isReported: false,
      instructionContent: {
        type: "doc",
        content: group.children.map((item) => ({
          type: "paragraph",
          content: [{ type: "text", text: String(item.instruction || item.title) }],
        })),
      },
      defaultTemplateCode: "",
      rubric: 0,
    })),
    exercises: (exerciseGroup?.children ?? []).map((item, index) => ({
      id: item.moduleId,
      order: index + 1,
      title: item.title,
      isReported: false,
      instructionContent: toDoc(item.instruction),
      defaultTemplateCode: "",
      rubric: 0,
    })),
    task: {
      experimentIds: [],
      exerciseIds: [],
      instructionContent: EMPTY_DOC,
      requireSelfDeclaration: false,
    },
    access: {
      accessMode: "readonly_submitted",
      canEdit: false,
      canSubmit: false,
      canSaveProgress: false,
      attemptType: data.attemptScope.attemptType,
      attemptLabel: data.attemptScope.label,
      remedialId: data.attemptScope.remedialId ?? undefined,
    },
  }
}

function buildSubmission(data: WorkpageResponse): JobsheetSubmission {
  return {
    id: data.submission.id ?? "monitoring-readonly",
    jobsheetId: data.context.jobsheetId,
    studentId: data.student.studentId,
    status: (data.submission.status as JobsheetSubmission["status"] | null) ?? "DRAFT",
    attemptType: data.attemptScope.attemptType,
    attemptLabel: data.attemptScope.label,
    remedialId: data.attemptScope.remedialId,
    isAutoSubmitted: data.submission.isAutoSubmitted,
    calculatedProgressScore: data.submission.progressScore?.progressScore ?? null,
    scoreBreakdown: null,
    report: {
      experiments: normalizeReportExperiments(data.submission.report.experiments),
      exercises: normalizeReportExercises(data.submission.report.exercises),
      conclusion: null,
    },
    experiments: [],
    exercises: [],
    updatedAt: data.progress.lastUpdatedAt ?? data.lastUpdatedAt,
    review: data.submission.finalScore != null ? { finalScore: data.submission.finalScore, comments: [] } : undefined,
  }
}

function locationToSidebarItem(location: MonitoringLocation | null) {
  if (!location) return null
  if (location.moduleType === "theory") return { type: "theory", id: location.moduleId, label: "Posisi Terakhir" }
  if (location.moduleType === "exercise") return { type: "exercise", id: location.moduleId, label: "Posisi Terakhir" }
  if (location.moduleType === "experiment") {
    return {
      type: "experiment",
      id: location.moduleId,
      label: location.stepId ? `Posisi Terakhir - ${location.title.split(" - ").pop()}` : "Posisi Terakhir",
    }
  }
  return null
}

function normalizeReportExperiments(
  experiments: WorkpageResponse["submission"]["report"]["experiments"] = {},
): JobsheetSubmission["report"]["experiments"] {
  return Object.fromEntries(
    Object.entries(experiments).map(([id, experiment]) => [
      id,
      { steps: normalizeReadonlySteps(experiment.steps ?? []) },
    ]),
  )
}

function normalizeReportExercises(
  exercises: WorkpageResponse["submission"]["report"]["exercises"] = {},
): JobsheetSubmission["report"]["exercises"] {
  return Object.fromEntries(
    Object.entries(exercises).map(([id, exercise]) => [
      id,
      {
        files: exercise.files ?? {},
        output: exercise.output ?? "",
        analysis: toDoc(exercise.analysis),
      },
    ]),
  )
}

function activeRoute(pathname: string, basePath: string) {
  const relative = pathname.slice(basePath.length).replace(/^\/+/, "")
  const [section = "", id = ""] = relative.split("/")
  return { section, id }
}

export default function LecturerStudentWorkpagePage() {
  const { kelasPraktikumId = "", jobsheetId = "", studentId = "" } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const attemptType = params.get("attemptType") || "normal"
  const remedialId = params.get("remedialId")
  const [data, setData] = useState<WorkpageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null)

  const basePath = `/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor`
  const monitoringParams = new URLSearchParams(location.search)
  monitoringParams.set("kelasPraktikumId", kelasPraktikumId)
  monitoringParams.set("classId", monitoringParams.get("classId") || kelasPraktikumId)
  monitoringParams.set("tab", "monitoring")
  const monitoringPath = `/jobsheets/${jobsheetId}?${monitoringParams.toString()}`

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const next = await getStudentMonitoringWorkpage(kelasPraktikumId, jobsheetId, studentId, attemptType, remedialId)
      setData(next)
      setLastRefreshAt(new Date().toISOString())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat pengerjaan mahasiswa.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [attemptType, jobsheetId, kelasPraktikumId, remedialId, studentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadData(true)
    }, 30000)

    return () => window.clearInterval(interval)
  }, [loadData])

  const jobsheet = useMemo(() => data ? buildJobsheet(data) : null, [data])
  const submission = useMemo(() => data ? buildSubmission(data) : null, [data])
  const course = useMemo<Course | null>(() => data ? ({
    id: "monitoring",
    name: data.context.className,
    code: data.context.className,
    semester: 0,
    programmingLanguage: data.context.programmingLanguage,
  }) : null, [data])

  useEffect(() => {
    if (!data || !jobsheet) return
    const route = activeRoute(location.pathname, basePath)
    if (route.section && route.id) return
    navigate(targetPathFromLocation(basePath, data, jobsheet, location.search), { replace: true })
  }, [basePath, data, jobsheet, location.pathname, location.search, navigate])

  if (loading && !data) {
    return <div className="px-6 py-8 text-sm text-gray-500">Memuat workpage mahasiswa...</div>
  }

  if (!data || !jobsheet || !submission) {
    return <div className="px-6 py-8 text-sm text-gray-500">Data workpage mahasiswa belum tersedia.</div>
  }

  const workData = data
  const workJobsheet = jobsheet
  const route = activeRoute(location.pathname, basePath)
  const completedItems = workData.progress.completedItems as StudentProgressItem[]
  const savedProgress = Math.round(workData.progress.progressPercentage || 0)
  const reviewParams = new URLSearchParams()
  reviewParams.set("submissionId", workData.submission.id ?? "")
  reviewParams.set("jobsheetId", jobsheetId)
  reviewParams.set("kelasPraktikumId", kelasPraktikumId)
  reviewParams.set("classId", params.get("classId") || kelasPraktikumId)
  reviewParams.set("courseId", params.get("courseId") || "monitoring")
  reviewParams.set("attemptType", workData.attemptScope.attemptType)
  if (workData.submission.attemptNo) reviewParams.set("attemptNo", String(workData.submission.attemptNo))
  if (workData.attemptScope.remedialId) reviewParams.set("remedialId", workData.attemptScope.remedialId)
  reviewParams.set("from", "monitor")
  const reviewPath = workData.submission.id ? `/reviews/${workData.student.studentId}?${reviewParams.toString()}` : ""
  const currentLocation = workData.progress.currentLocation

  function handleAttemptChange(value: string) {
    const nextParams = new URLSearchParams(location.search)
    const selected = workData.attempts.find((attempt) => `${attempt.attemptType}:${attempt.remedialId ?? ""}` === value)
    if (!selected) return
    nextParams.set("attemptType", selected.attemptType)
    if (selected.remedialId) nextParams.set("remedialId", selected.remedialId)
    else nextParams.delete("remedialId")
    navigate(`${basePath}?${nextParams.toString()}`)
  }

  function renderMainContent() {
    if (route.section === "theory") {
      const theory = workJobsheet.theory.find((item) => item.id === route.id)
      if (!theory) return <EmptyWorkState text="Materi tidak ditemukan." />
      const completed = completedItems.some((item) => item.type === "theory" && item.id === theory.id)
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">{theory.title}</h1>
            <p className="mt-2 text-sm font-semibold text-blue-700">
              {completed ? "Sudah dibuka mahasiswa" : "Belum tercatat selesai"}
            </p>
          </div>
          <RichTextViewer content={theory.content} mode="viewer-theory" />
        </div>
      )
    }

    if (route.section === "experiments") {
      const experiment = workJobsheet.experiments.find((item) => item.id === route.id)
      const group = groupById(workData.structure, route.id)
      const rawSteps = workData.submission.report.experiments?.[route.id]?.steps ?? []
      const steps = normalizeReadonlySteps(rawSteps)
      if (!experiment) return <EmptyWorkState text="Percobaan tidak ditemukan." />
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">{experiment.title}</h1>
            {currentLocation?.moduleType === "experiment" && currentLocation.moduleId === experiment.id && (
              <p className="mt-2 text-sm font-semibold text-blue-700">Posisi Terakhir: {currentLocation.title}</p>
            )}
          </div>
          <RichTextViewer content={experiment.instructionContent ?? EMPTY_DOC} mode="viewer-default" />
          {hasSavedWorkspace(rawSteps) ? (
            <InstructionWorkspaceCard
              title={experiment.title}
              label="Monitoring Dosen"
              instructions={(group?.children ?? []).map((item) => toDoc(item.instruction || item.title))}
              templateCode=""
              language={workData.context.programmingLanguage || "java"}
              initialSteps={steps}
              readOnly
            />
          ) : (
            <EmptyWorkState text="Belum ada pengerjaan yang disimpan mahasiswa pada bagian ini." />
          )}
        </div>
      )
    }

    if (route.section === "exercises") {
      const exercise = workJobsheet.exercises.find((item) => item.id === route.id)
      const rawExercise = workData.submission.report.exercises?.[route.id]
      const rawSteps = rawExercise ? [rawExercise] : []
      if (!exercise) return <EmptyWorkState text="Latihan tidak ditemukan." />
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">{exercise.title}</h1>
            {currentLocation?.moduleType === "exercise" && currentLocation.moduleId === exercise.id && (
              <p className="mt-2 text-sm font-semibold text-blue-700">Posisi Terakhir</p>
            )}
          </div>
          <RichTextViewer content={exercise.instructionContent ?? EMPTY_DOC} mode="viewer-default" />
          {hasSavedWorkspace(rawSteps) ? (
            <InstructionWorkspaceCard
              title={exercise.title}
              label="Monitoring Dosen"
              instructions={[exercise.instructionContent ?? EMPTY_DOC]}
              templateCode=""
              language={workData.context.programmingLanguage || "java"}
              initialSteps={normalizeReadonlySteps(rawSteps)}
              readOnly
            />
          ) : (
            <EmptyWorkState text="Belum ada pengerjaan yang disimpan mahasiswa pada bagian ini." />
          )}
        </div>
      )
    }

    return <EmptyWorkState text="Pilih modul dari daftar modul." />
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <WorkHeader
        title={jobsheet.title}
        backTo={monitoringPath}
        course={course}
        jobsheet={jobsheet}
        basePath={basePath}
      />

      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Monitoring Dosen
            </span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] text-gray-500 font-semibold">
              Sync: {formatClock(lastRefreshAt || data.lastUpdatedAt)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Card 1: Mahasiswa */}
          <div className="flex flex-col justify-between p-2 bg-white rounded border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Mahasiswa</span>
              <User className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="mt-1 min-w-0">
              <h3 className="text-xs font-bold text-gray-900 truncate" title={data.student.name}>
                {data.student.name}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">NIM: {data.student.nim}</p>
            </div>
            <div className="mt-1.5">
              {renderStatusBadge(data.status)}
            </div>
          </div>

          {/* Card 2: Posisi Terakhir */}
          <div className="flex flex-col justify-between p-2 bg-white rounded border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Posisi Terakhir</span>
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 min-w-0">
              <h3 className="text-xs font-bold text-gray-900 truncate" title={currentLocation?.title ?? "-"}>
                {currentLocation?.title ?? "-"}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                Update: {formatDate(data.progress.lastUpdatedAt)}
              </p>
            </div>
            <div className="mt-1.5 text-[9px] font-medium text-gray-400 truncate">
              {data.submission.isAutoSubmitted && "Dikumpulkan otomatis (deadline)."}
              {data.status === "Belum Memulai" && "Belum ada aktivitas."}
              {!data.submission.isAutoSubmitted && data.status !== "Belum Memulai" && "Sedang berjalan."}
            </div>
          </div>

          {/* Card 3: Aktivitas */}
          <div className="flex flex-col justify-between p-2 bg-white rounded border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Aktivitas</span>
              <Activity className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-medium">Run Kode:</span>
                <span className="font-bold text-gray-900 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">
                  {data.monitoringStats?.runCount ?? 0} kali
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-medium">Stuck:</span>
                {renderStuckValue(data.monitoringStats)}
              </div>
            </div>
            <div className="mt-1.5 text-[9px] font-semibold text-gray-400">
              Sesi: {data.attemptScope.label}
            </div>
          </div>

          {/* Card 4: Aksi & Sesi */}
          <div className="flex flex-col justify-between p-2 bg-white rounded border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Aksi & Sesi</span>
              <Settings className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="mt-1 space-y-1.5">
              {data.attempts.length > 1 ? (
                <select
                  value={`${data.attemptScope.attemptType}:${data.attemptScope.remedialId ?? ""}`}
                  onChange={(event) => handleAttemptChange(event.target.value)}
                  className="w-full h-6 rounded border border-gray-200 bg-white px-1.5 py-0 text-[10px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {data.attempts.map((attempt) => (
                    <option key={`${attempt.attemptType}:${attempt.remedialId ?? ""}`} value={`${attempt.attemptType}:${attempt.remedialId ?? ""}`}>
                      {attempt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-100 text-[10px] font-semibold text-gray-500 px-1.5">
                  {data.attemptScope.label}
                </div>
              )}
              <div className="grid grid-cols-3 gap-0.5">
                <button
                  type="button"
                  onClick={() => loadData()}
                  title="Refresh Data"
                  className="inline-flex h-6 items-center justify-center gap-0.5 rounded border border-gray-200 bg-white text-[10px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="sr-only lg:not-sr-only">Refresh</span>
                </button>
                {reviewPath ? (
                  <Link
                    to={reviewPath}
                    title="Buka Review"
                    className="inline-flex h-6 items-center justify-center gap-0.5 rounded bg-blue-600 text-[10px] font-bold text-white hover:bg-blue-700 cursor-pointer text-center"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    <span className="sr-only lg:not-sr-only">Review</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Belum ada pengerjaan."
                    className="inline-flex h-6 cursor-not-allowed items-center justify-center gap-0.5 rounded bg-gray-50 text-[10px] font-bold text-gray-400 border border-gray-200"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    <span className="sr-only lg:not-sr-only">Review</span>
                  </button>
                )}
                <Link
                  to={monitoringPath}
                  title="Kembali ke Monitoring Mahasiswa"
                  className="inline-flex h-6 items-center justify-center gap-0.5 rounded border border-gray-200 bg-white text-[10px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer text-center"
                >
                  <span className="sr-only lg:not-sr-only">Kembali</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          <div className="mx-auto max-w-6xl">{renderMainContent()}</div>
        </main>

        <WorkSidebar
          courseId="monitoring"
          jobsheet={jobsheet}
          submission={submission}
          savedProgress={savedProgress}
          completedItems={completedItems}
          basePath={basePath}
          lastPositionItem={locationToSidebarItem(currentLocation)}
        />
      </div>

      <WorkFooterNav
        courseId="monitoring"
        jobsheet={jobsheet}
        submission={submission}
        savedProgress={savedProgress}
        completedItems={completedItems}
        basePath={basePath}
        backTo={monitoringPath}
      />
    </div>
  )
}

function EmptyWorkState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-10 text-center text-sm font-medium text-gray-500">
      {text}
    </div>
  )
}
