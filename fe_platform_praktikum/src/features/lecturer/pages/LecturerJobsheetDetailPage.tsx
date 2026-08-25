import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  BookOpen,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  Save,
  X,
  UserCheck,
  MessageSquare,
} from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import StudentProfileModal from "../components/StudentProfileModal"
import { toast } from "../../../components/toast/toastStore"
import { connectMonitoringSse, type MonitoringSseEvent } from "../../../services/monitoringSse"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import {
  formatAcademicDateTime,
  formatAcademicTableDateTime,
  formatAcademicDate,
  formatAcademicTime,
} from "../../../shared/utils/formatAcademicDateTime"
import { formatTemplateCodeForDisplay } from "../../../shared/utils/codeTemplateUtils"
import { formatNumber, formatScore as centralFormatScore } from "../../../shared/utils/formatScore"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import type { Jobsheet } from "../../../services/jobsheet/types"
import LecturerLayout from "../components/LecturerLayout"
import { IndonesianDateTimePicker } from "../components/IndonesianDateTimePicker"
import { datetimeLocalToDbValue } from "../utils/deadline"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerModal,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  SearchBox,
  TabButton,
} from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerEvaluationSubmissions,
  getLecturerJobsheetById,
  getLecturerSubmissionMatrix,
  formatAttemptLabel,
  getLecturerClassProgress,
  getLecturerStudentDetailProgress,
  createLecturerRemedial,
  getLecturerRemedials,
  getLecturerRemedialStudents,
  cancelLecturerRemedial,
  type LecturerSubmissionMatrixItem,
  type LecturerEvaluationItem,
  type LecturerClassProgressResponse,
  type LecturerStudentDetailProgressResponse,
  type LecturerRemedialSession,
  type LecturerRemedialStudent,
} from "../service"
import { academicCourseBasePath } from "../../../services/academicScope"
import LecturerChatDrawer from "../components/LecturerChatDrawer"

type DetailTab = "detail" | "monitoring" | "students" | "remedial"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "detail", label: "Konten Jobsheet" },
  { id: "monitoring", label: "Monitoring Mahasiswa" },
  { id: "students", label: "Evaluasi & Nilai" },
  { id: "remedial", label: "Sesi Remedial" },
]



export default function LecturerJobsheetDetailPage() {
  const navigate = useNavigate()
  const { goBackToParent } = useBackNavigation()
  const { jobsheetId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId") ?? ""
  const classId = searchParams.get("classId") ?? ""
  const mataKuliahId = searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const nativeScope = useMemo(() => ({ mataKuliahId, kelasPraktikumId }), [kelasPraktikumId, mataKuliahId])
  const jobsheetBasePath = `${academicCourseBasePath(courseId, nativeScope)}/jobsheets`
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    const queryTab = searchParams.get("tab") as DetailTab
    if (queryTab && ["detail", "monitoring", "students", "remedial"].includes(queryTab)) return queryTab
    const savedTab = sessionStorage.getItem(`activeTab_jobsheet_${jobsheetId}`) as DetailTab
    if (savedTab && ["detail", "monitoring", "students", "remedial"].includes(savedTab)) {
      return savedTab
    }
    return "detail"
  })

  useEffect(() => {
    if (jobsheetId) {
      sessionStorage.setItem(`activeTab_jobsheet_${jobsheetId}`, activeTab)
    }
  }, [activeTab, jobsheetId])

  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])
  const [evaluationItems, setEvaluationItems] = useState<LecturerEvaluationItem[]>([])
  const [loadingEvaluationItems, setLoadingEvaluationItems] = useState(false)
  const [attemptFilter, setAttemptFilter] = useState<"all" | "normal" | "remedial">("all")

  // Remedial states
  const [remedials, setRemedials] = useState<LecturerRemedialSession[]>([])
  const [loadingRemedials, setLoadingRemedials] = useState(false)
  const [isRemedialModalOpen, setIsRemedialModalOpen] = useState(false)
  const [selectedRemedialId, setSelectedRemedialId] = useState<string | null>(null)
  const [remedialStudents, setRemedialStudents] = useState<LecturerRemedialStudent[]>([])
  const [loadingRemedialStudents, setLoadingRemedialStudents] = useState(false)

  // Sesi Remedial Modal Form states
  const [remStartDateTime, setRemStartDateTime] = useState("")
  const [remEndDateTime, setRemEndDateTime] = useState("")
  const [remSelectedStudentIds, setRemSelectedStudentIds] = useState<string[]>([])
  const [savingRemedial, setSavingRemedial] = useState(false)
  const [cancelRemedialTarget, setCancelRemedialTarget] = useState<LecturerRemedialSession | null>(null)
  const [cancellingRemedial, setCancellingRemedial] = useState(false)
  const [isLecturerChatOpen, setIsLecturerChatOpen] = useState(false)
  const [selectedChatStudent, setSelectedChatStudent] = useState<{ id: string; name: string } | null>(null)

  async function fetchEvaluationItems() {
    const effectiveKelasPraktikumId = kelasPraktikumId || classId
    if (!jobsheetId || !effectiveKelasPraktikumId) {
      setEvaluationItems([])
      return
    }

    setLoadingEvaluationItems(true)
    try {
      const items = await getLecturerEvaluationSubmissions(jobsheetId, effectiveKelasPraktikumId)
      setEvaluationItems(items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat evaluasi dan nilai.")
    } finally {
      setLoadingEvaluationItems(false)
    }
  }

  async function handleCreateRemedialSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobsheetId || !classId) return
    
    if (!remStartDateTime) {
      toast.error("Pilih waktu mulai remedial terlebih dahulu.")
      return
    }
    if (!remEndDateTime) {
      toast.error("Pilih waktu berakhir remedial terlebih dahulu.")
      return
    }
    if (remSelectedStudentIds.length === 0) {
      toast.error("Pilih minimal satu mahasiswa untuk remedial.")
      return
    }

    const startDbVal = datetimeLocalToDbValue(remStartDateTime)
    const endDbVal = datetimeLocalToDbValue(remEndDateTime)

    if (!startDbVal || !endDbVal) {
      toast.error("Format tanggal dan waktu remedial tidak valid.")
      return
    }

    const startDate = new Date(remStartDateTime)
    const endDate = new Date(remEndDateTime)

    const startDay = remStartDateTime.slice(0, 10)
    const endDay = remEndDateTime.slice(0, 10)

    if (endDay < startDay) {
      toast.error("Tanggal berakhir tidak boleh lebih awal daripada tanggal mulai.")
      return
    }

    if (endDay === startDay && endDate.getTime() <= startDate.getTime()) {
      toast.error("Jam berakhir tidak boleh lebih awal daripada jam mulai pada hari yang sama.")
      return
    }

    if (endDate.getTime() <= startDate.getTime()) {
      toast.error("Waktu berakhir remedial harus setelah waktu mulai.")
      return
    }

    if (endDate.getTime() <= Date.now()) {
      toast.error("Waktu berakhir remedial tidak boleh berada pada waktu yang telah berlalu.")
      return
    }

    const defaultTitle = jobsheet?.title ? `Remedial ${jobsheet.title}` : "Remedial"

    setSavingRemedial(true)
    try {
      await createLecturerRemedial(jobsheetId, {
        kelasPraktikumId: kelasPraktikumId || classId,
        title: defaultTitle,
        description: "",
        startAt: startDbVal,
        endAt: endDbVal,
        studentIds: remSelectedStudentIds,
      })
      toast.success("Sesi remedial berhasil dibuat.")
      setIsRemedialModalOpen(false)
      setRemStartDateTime("")
      setRemEndDateTime("")
      setRemSelectedStudentIds([])
      fetchRemedials()
      if (jobsheet) {
        const classDetail = await getLecturerClassDetail(classId)
        const submissionMatrix = await getLecturerSubmissionMatrix(
          classDetail.courseId,
          classDetail.jobsheets.filter((item) => item.id === jobsheetId),
          classDetail.students,
          {
            mataKuliahId: classDetail.mataKuliahId || classDetail.id_mata_kuliah || mataKuliahId,
            kelasPraktikumId: classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum || kelasPraktikumId,
          },
        )
        setMatrix(submissionMatrix)
        fetchEvaluationItems()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat sesi remedial.")
    } finally {
      setSavingRemedial(false)
    }
  }

  async function handleConfirmCancelRemedial() {
    if (!cancelRemedialTarget) return
    const remedialId = cancelRemedialTarget.id
    setCancellingRemedial(true)
    try {
      await cancelLecturerRemedial(remedialId)
      toast.success("Sesi remedial berhasil dibatalkan.")
      setCancelRemedialTarget(null)
      if (selectedRemedialId === remedialId) {
        setSelectedRemedialId(null)
      }
      fetchRemedials()
      if (jobsheet && classId) {
        const classDetail = await getLecturerClassDetail(classId)
        const submissionMatrix = await getLecturerSubmissionMatrix(
          classDetail.courseId,
          classDetail.jobsheets.filter((item) => item.id === jobsheetId),
          classDetail.students,
          {
            mataKuliahId: classDetail.mataKuliahId || classDetail.id_mata_kuliah || mataKuliahId,
            kelasPraktikumId: classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum || kelasPraktikumId,
          },
        )
        setMatrix(submissionMatrix)
        fetchEvaluationItems()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan sesi remedial.")
    } finally {
      setCancellingRemedial(false)
    }
  }

  // Load remedials sessions
  const fetchRemedials = useMemo(() => async () => {
    if (!jobsheetId) return
    setLoadingRemedials(true)
    try {
      const list = await getLecturerRemedials(jobsheetId)
      setRemedials(list)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat sesi remedial.")
    } finally {
      setLoadingRemedials(false)
    }
  }, [jobsheetId])

  useEffect(() => {
    if (activeTab === "remedial") {
      fetchRemedials()
    }
  }, [activeTab, fetchRemedials])

  // Load students of a remedial session
  useEffect(() => {
    async function loadRemedialStudents() {
      if (!selectedRemedialId) {
        setRemedialStudents([])
        return
      }
      setLoadingRemedialStudents(true)
      try {
        const list = await getLecturerRemedialStudents(selectedRemedialId)
        setRemedialStudents(list)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat daftar mahasiswa remedial.")
      } finally {
        setLoadingRemedialStudents(false)
      }
    }
    loadRemedialStudents()
  }, [selectedRemedialId])

  // Progress monitoring states
  const [monitoringData, setMonitoringData] = useState<LecturerClassProgressResponse | null>(null)
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<LecturerStudentDetailProgressResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [monitoringKeyword, setMonitoringKeyword] = useState("")
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<string>("all")
  const [monitoringSortBy, setMonitoringSortBy] = useState<string>("name_asc")

  // Load progress monitoring data
  useEffect(() => {
    let intervalId: ReturnType<typeof window.setInterval> | null = null

    async function loadMonitoring() {
      if (activeTab !== "monitoring" || !jobsheetId || !classId) return
      
      try {
        if (!monitoringData) setLoadingMonitoring(true)
        const progress = await getLecturerClassProgress(jobsheetId, classId, kelasPraktikumId)
        setMonitoringData(progress)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat monitoring progress.")
      } finally {
        setLoadingMonitoring(false)
      }
    }

    if (activeTab === "monitoring") {
      loadMonitoring()
      intervalId = setInterval(loadMonitoring, 20000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeTab, jobsheetId, classId, kelasPraktikumId, monitoringData])

  // Realtime SSE monitoring subscription for LecturerJobsheetDetailPage
  useEffect(() => {
    const effectiveKelasPraktikumId = kelasPraktikumId || classId
    if (activeTab !== "monitoring" || !effectiveKelasPraktikumId) return undefined

    console.log("[Monitoring][SSE] Connecting LecturerJobsheetDetailPage SSE stream for kelasPraktikumId:", effectiveKelasPraktikumId)

    const disconnect = connectMonitoringSse(
      effectiveKelasPraktikumId,
      (event: MonitoringSseEvent) => {
        console.log("[SSE-CLIENT][LECTURER-DETAIL] SSE event received:", event.type, event)
        if (event.type === "student-position-updated" || event.type === "student-monitoring-updated") {
          if (!event.studentId) return
          setMonitoringData((prev) => {
            if (!prev) return prev
            const nextStudents = prev.students.map((st) => {
              if (st.student_id === event.studentId) {
                const nextPos = event.sectionName || st.current_position_title || "Percobaan 1"
                console.log(`[MONITORING-UI][POSITION-UPDATE] Student ${st.fullname} position updated: ${st.current_position_title} -> ${nextPos}`)
                return {
                  ...st,
                  current_position_title: nextPos,
                  last_activity_at: event.lastActiveAt || new Date().toISOString(),
                  status: st.status === "not_started" ? ("in_progress" as const) : st.status,
                }
              }
              return st
            })
            return {
              ...prev,
              students: nextStudents,
            }
          })
        }

        if (event.type === "student-run-count-updated") {
          if (!event.studentId) return
          console.log(`[MONITORING-UI][RUN-COUNT-UPDATE] Student ${event.studentId} run count updated`)
          setMonitoringData((prev) => {
            if (!prev) return prev
            const nextStudents = prev.students.map((st) => {
              if (st.student_id === event.studentId) {
                return {
                  ...st,
                  last_activity_at: new Date().toISOString(),
                }
              }
              return st
            })
            return {
              ...prev,
              students: nextStudents,
            }
          })
        }
      },
      (status) => {
        console.log("[SSE-CLIENT][LECTURER-DETAIL] Stream status:", status)
      }
    )

    return () => {
      console.log("[SSE-CLIENT][LECTURER-DETAIL] Disconnecting SSE stream")
      disconnect()
    }
  }, [activeTab, kelasPraktikumId, classId])

  // Load student log details
  useEffect(() => {
    async function loadDetail() {
      if (!selectedStudentId || !jobsheetId || !classId) {
        setStudentDetail(null)
        return
      }

      setLoadingDetail(true)
      try {
        const detail = await getLecturerStudentDetailProgress(jobsheetId, selectedStudentId, classId, kelasPraktikumId)
        setStudentDetail(detail)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat detail progress mahasiswa.")
      } finally {
        setLoadingDetail(false)
      }
    }

    loadDetail()
  }, [selectedStudentId, jobsheetId, classId, kelasPraktikumId])

  const sortedAndFilteredProgressStudents = useMemo(() => {
    if (!monitoringData) return []
    let students = [...monitoringData.students]

    if (monitoringKeyword.trim()) {
      const kw = monitoringKeyword.toLowerCase()
      students = students.filter(
        (s) =>
          s.fullname.toLowerCase().includes(kw) ||
          s.nim.toLowerCase().includes(kw)
      )
    }

    if (monitoringStatusFilter !== "all") {
      students = students.filter((s) => s.status === monitoringStatusFilter)
    }

    students.sort((a, b) => {
      if (monitoringSortBy === "name_asc") {
        return a.fullname.localeCompare(b.fullname, "id-ID")
      }
      if (monitoringSortBy === "name_desc") {
        return b.fullname.localeCompare(a.fullname, "id-ID")
      }
      if (monitoringSortBy === "progress_desc") {
        return b.progress_percentage - a.progress_percentage
      }
      if (monitoringSortBy === "progress_asc") {
        return a.progress_percentage - b.progress_percentage
      }
      if (monitoringSortBy === "activity_desc") {
        const timeA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0
        const timeB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0
        return timeB - timeA
      }
      return 0
    })

    return students
  }, [monitoringData, monitoringKeyword, monitoringStatusFilter, monitoringSortBy])

  function openStudentMonitor(studentId: string, attempt?: { attemptType?: string | null; remedialId?: string | null }) {
    const effectiveKelasPraktikumId = kelasPraktikumId || classId
    if (!effectiveKelasPraktikumId || !jobsheetId) {
      toast.error("Konteks kelas praktikum belum lengkap.")
      return
    }
    const params = new URLSearchParams()
    if (courseId) params.set("courseId", courseId)
    if (classId) params.set("classId", classId)
    if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
    params.set("kelasPraktikumId", effectiveKelasPraktikumId)
    params.set("attemptType", attempt?.attemptType === "remedial" ? "remedial" : "normal")
    if (attempt?.remedialId) params.set("remedialId", attempt.remedialId)

    navigate(`/lecturer/kelas-praktikum/${effectiveKelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor?${params.toString()}`)
  }

  function formatRelativeTime(timestamp?: string | null) {
    if (!timestamp) return "-"
    const diffMs = new Date().getTime() - new Date(timestamp).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Baru saja"
    if (diffMins < 60) return `${diffMins} menit lalu`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} jam lalu`
    return formatAcademicDate(timestamp)
  }

  function renderStatusBadge(status: "not_started" | "in_progress" | "stalled" | "completed" | "overdue") {
    const styles = {
      not_started: "bg-gray-100 text-gray-700 border-gray-200",
      in_progress: "bg-blue-50 text-blue-700 border-blue-100",
      stalled: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse",
      overdue: "bg-amber-50 text-amber-700 border-amber-100",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    }
    
    const labels = {
      not_started: "Belum Mulai",
      in_progress: "Mengerjakan",
      stalled: "Tidak Aktif",
      overdue: "Terlambat",
      completed: "Selesai",
    }
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          status === "not_started" ? "bg-gray-500" :
          status === "in_progress" ? "bg-blue-500" :
          (status === "stalled" || status === "overdue") ? "bg-amber-500" : "bg-emerald-500"
        }`} />
        {labels[status]}
      </span>
    )
  }

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) {
        setLoading(false)
        setError("Context courseId atau jobsheetId tidak lengkap.")
        return
      }

      setLoading(true)
      setError("")

      try {
        const selectedJobsheet = await getLecturerJobsheetById(courseId, jobsheetId, nativeScope)
        setJobsheet(selectedJobsheet)

        if (classId) {
          const classDetail = await getLecturerClassDetail(classId)
          const submissionMatrix = await getLecturerSubmissionMatrix(
            classDetail.courseId,
            classDetail.jobsheets.filter((item) => item.id === jobsheetId),
            classDetail.students,
            {
              mataKuliahId: classDetail.mataKuliahId || classDetail.id_mata_kuliah || mataKuliahId,
              kelasPraktikumId: classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum || kelasPraktikumId,
            },
          )
          setMatrix(submissionMatrix)
          fetchEvaluationItems()
        } else {
          setMatrix([])
          setEvaluationItems([])
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail jobsheet.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId, courseId, jobsheetId, kelasPraktikumId, mataKuliahId, nativeScope])

  function getEvaluationStatus(submission: LecturerEvaluationItem["submission"]) {
    if (!submission) return "Belum"
    if (submission.aiEvaluationStatus === "queued" || submission.aiEvaluationStatus === "processing") {
      return "AI sedang mengevaluasi"
    }
    if (submission.status === "DRAFT") return "Draft"
    if (submission.review?.decision === "PENDING" && submission.aiEvaluationStatus === "completed") {
      return "Menunggu Review Dosen"
    }
    if (submission.status === "ACCEPTED" || submission.status === "REVISION" || submission.review?.decision === "ACCEPTED" || submission.review?.decision === "REVISION") {
      return "Sudah dinilai"
    }
    if (submission.status === "OVERDUE") return "Terlambat"
    return "Menunggu Review"
  }

  const filteredEvaluationItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return evaluationItems.filter((item) => {
      const matchKeyword =
        !normalized ||
        [item.student.fullname, item.student.nim].some((value) => value.toLowerCase().includes(normalized))
      const reviewStatus = getEvaluationStatus(item.submission)
      const matchStatus = status === "all" || reviewStatus === status
      const matchAttempt = attemptFilter === "all" || item.submission?.attemptType === attemptFilter

      return matchKeyword && matchStatus && matchAttempt
    })
  }, [attemptFilter, evaluationItems, keyword, status])

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout
      onBack={() => {
        goBackToParent({
          parentPath: classId 
            ? `/kelas-praktikum/${courseId}/${classId}` 
            : courseId 
              ? `/mata-kuliah/${courseId}/jobsheets` 
              : "/mata-kuliah",
          fallbackPath: "/mata-kuliah",
          preserveQueryParams: ["courseId", "classId", "mataKuliahId", "kelasPraktikumId"],
        })
      }}
    >

      <PageHeader
        title={jobsheet ? jobsheet.title : "Detail Jobsheet"}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!jobsheet ? (
        <LecturerEmptyState title="Jobsheet tidak ditemukan." />
      ) : (
        <>
          <TabButton tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <LecturerPanel className="rounded-t-none p-5">
            {activeTab === "detail" && (
              <div className="space-y-5">
                <LecturerPanel className="p-5">
                  <h2 className="text-lg font-semibold">Informasi Umum</h2>
                  <p className="mt-3 text-sm text-gray-700">Judul Jobsheet: {jobsheet.title}</p>
                  <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline || "-"}</p>
                  <p className="text-sm text-gray-700">Deskripsi: {jobsheet.description || "-"}</p>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Tujuan Praktikum</h2>
                  <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                    {jobsheet.goal || "Belum ada tujuan praktikum."}
                  </p>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Dasar Teori</h2>
                  {jobsheet.theory.length ? (
                    <div className="space-y-4">
                      {jobsheet.theory.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-2 font-semibold">{item.title}</p>
                          <RichTextViewer content={item.content} role="DOSEN" mode="viewer-default" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada dasar teori.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Percobaan Praktikum</h2>
                  {jobsheet.experiments.length ? (
                    <div className="space-y-4">
                      {jobsheet.experiments.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-blue-50 p-4 text-sm text-gray-700">
                          <p className="font-semibold">
                            Percobaan {item.order}: {item.title}{" "}
                            <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                              (Bobot: {item.rubric ?? 0}%)
                            </span>
                          </p>
                          <div className="mt-3">
                            <RichTextViewer content={item.instructionContent ?? { type: "doc", content: [] }} role="DOSEN" mode="viewer-default" />
                          </div>
                          {item.defaultTemplateCode && (
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800 font-mono">
                              <code>{formatTemplateCodeForDisplay(item.defaultTemplateCode)}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada percobaan praktikum.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Latihan Praktikum</h2>
                  {jobsheet.exercises.length ? (
                    <div className="space-y-4">
                      {jobsheet.exercises.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-blue-50 p-4 text-sm text-gray-700">
                          <p className="font-semibold">
                            Latihan {item.order}: {item.title}{" "}
                            <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                              (Bobot: {item.rubric ?? 0}%)
                            </span>
                          </p>
                          <div className="mt-3">
                            <RichTextViewer content={item.instructionContent ?? { type: "doc", content: [] }} role="DOSEN" mode="viewer-default" />
                          </div>
                          {item.defaultTemplateCode && (
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800 font-mono">
                              <code>{formatTemplateCodeForDisplay(item.defaultTemplateCode)}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada latihan praktikum.</p>
                  )}
                </LecturerPanel>

                <LecturerButton onClick={() => {
                  const query = searchParams.toString() ? `?${searchParams.toString()}` : ""
                  navigate(`${jobsheetBasePath}/${jobsheet.id}/edit${query}`)
                }}>
                  Edit Jobsheet
                </LecturerButton>
              </div>
            )}

            {activeTab === "monitoring" && (
              <div className="space-y-6">
                {/* 1. Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider">Total Mahasiswa</span>
                      <Activity size={16} />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-800">
                      {monitoringData?.summary.totalStudents ?? 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="text-xs font-semibold uppercase tracking-wider">Belum Mulai</span>
                      <Clock size={16} />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">
                      {monitoringData?.summary.notStartedCount ?? 0}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-blue-500">
                      <span className="text-xs font-semibold uppercase tracking-wider">Mengerjakan</span>
                      <PlayCircle size={16} />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-blue-800">
                      {monitoringData?.summary.inProgressCount ?? 0}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-amber-500">
                      <span className="text-xs font-semibold uppercase tracking-wider">Tidak Aktif</span>
                      <Loader2 className={monitoringData?.summary.stalledCount ? "animate-spin" : ""} size={16} />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-amber-800">
                      {monitoringData?.summary.stalledCount ?? 0}
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between text-emerald-500">
                      <span className="text-xs font-semibold uppercase tracking-wider">Selesai</span>
                      <UserCheck size={16} />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-emerald-800">
                      {monitoringData?.summary.completedCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* 2. Toolbar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">Daftar Kemajuan</h3>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!jobsheetId || !classId) return
                        setLoadingMonitoring(true)
                        try {
                          const progress = await getLecturerClassProgress(jobsheetId, classId, kelasPraktikumId)
                          setMonitoringData(progress)
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Gagal memperbarui data monitoring.")
                        } finally {
                          setLoadingMonitoring(false)
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition duration-150"
                      title="Perbarui Data"
                    >
                      <RefreshCw size={16} className={loadingMonitoring ? "animate-spin" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetKpId = kelasPraktikumId || classId
                        if (targetKpId && jobsheetId) {
                          navigate(`/lecturer/kelas-praktikum/${targetKpId}/jobsheets/${jobsheetId}/monitoring`)
                        }
                      }}
                      className="ml-2 flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-xs px-2.5 py-1 rounded-lg transition duration-150"
                      title="Buka Tampilan Visual Sidebar Modul"
                    >
                      <Activity size={14} />
                      <span>Mode Visual Modul</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</label>
                      <select
                        value={monitoringStatusFilter}
                        onChange={(e) => setMonitoringStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700"
                      >
                        <option value="all">Semua Status</option>
                        <option value="not_started">Belum Mulai</option>
                        <option value="in_progress">Mengerjakan</option>
                        <option value="stalled">Tidak Aktif</option>
                        <option value="completed">Selesai</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urutan:</label>
                      <select
                        value={monitoringSortBy}
                        onChange={(e) => setMonitoringSortBy(e.target.value)}
                        className="bg-white border border-gray-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700"
                      >
                        <option value="name_asc">Nama (A - Z)</option>
                        <option value="name_desc">Nama (Z - A)</option>
                        <option value="progress_desc">Progres Terbanyak</option>
                        <option value="progress_asc">Progres Terkecil</option>
                        <option value="activity_desc">Aktivitas Terkini</option>
                      </select>
                    </div>

                    <SearchBox value={monitoringKeyword} onChange={setMonitoringKeyword} placeholder="Cari NIM atau Nama" />
                  </div>
                </div>

                {/* 3. Students progress table */}
                {!sortedAndFilteredProgressStudents.length ? (
                  <LecturerEmptyState title="Tidak ada mahasiswa yang cocok dengan filter saat ini." />
                ) : (
                  <LecturerTable headers={["Nama Mahasiswa", "NIM", "Status", "Posisi Terakhir", "Kemajuan", "Aktivitas Terakhir", "Aksi"]}>
                    {sortedAndFilteredProgressStudents.map((student) => (
                      <tr key={student.student_id}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentProfileId(student.student_id)}
                            className="flex items-center gap-3 hover:text-blue-700 transition text-left focus:outline-none"
                          >
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                {student.fullname.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{student.fullname}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{student.nim}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            {renderStatusBadge(student.status)}
                            {(student as any).attempt_type === "remedial" && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">
                                Remedial {(student as any).attempt_no - 1}
                              </span>
                            )}
                            {student.is_auto_submitted && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5">
                                Dikumpulkan Otomatis
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate" title={student.current_position_title}>
                          {student.current_position_title}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  student.status === "completed" ? "bg-emerald-500" :
                                  student.status === "stalled" ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${student.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-600">{Math.round(student.progress_percentage)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600" title={student.last_activity_at ? formatAcademicDateTime(student.last_activity_at) : "-"}>
                          {formatRelativeTime(student.last_activity_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition duration-150 hover:bg-blue-700"
                              onClick={() => openStudentMonitor(student.student_id, {
                                attemptType: (student as any).attempt_type,
                                remedialId: (student as any).remedial_id,
                              })}
                            >
                              Monitor
                            </button>
                            <button
                              type="button"
                              className="font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs transition duration-150"
                              onClick={() => setSelectedStudentId(student.student_id)}
                            >
                              Detail Log
                            </button>
                            <button
                              type="button"
                              className="font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg text-xs transition duration-150 flex items-center gap-1"
                              onClick={() => {
                                setSelectedChatStudent({
                                  id: student.student_id,
                                  name: student.fullname,
                                })
                                setIsLecturerChatOpen(true)
                              }}
                            >
                              <MessageSquare size={13} />
                              Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </LecturerTable>
                )}
              </div>
            )}

            {activeTab === "students" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <NativeSelect value={status} onChange={setStatus} label="Status">
                    <option value="all">Semua Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Menunggu Review">Menunggu Review</option>
                    <option value="AI sedang mengevaluasi">AI sedang mengevaluasi</option>
                    <option value="Menunggu Review Dosen">Menunggu Review Dosen</option>
                    <option value="Sudah dinilai">Sudah dinilai</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Belum">Belum</option>
                  </NativeSelect>
                  <NativeSelect value={attemptFilter} onChange={(value) => setAttemptFilter(value as typeof attemptFilter)} label="Jenis Pengerjaan">
                    <option value="all">Semua Jenis Pengerjaan</option>
                    <option value="normal">Pengerjaan Reguler</option>
                    <option value="remedial">Remedial</option>
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
                </div>

                {loadingEvaluationItems ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <span className="text-sm font-semibold text-gray-600">Memuat evaluasi dan nilai...</span>
                  </div>
                ) : !filteredEvaluationItems.length ? (
                  <LecturerEmptyState title="Belum ada data submission mahasiswa untuk jobsheet ini." />
                ) : (
                  <LecturerTable headers={["NIM", "Mahasiswa", "Jenis Pengerjaan", "Status", "Nilai AI", "Progres", "Nilai Akhir", "Aksi"]}>
                    {filteredEvaluationItems.map((item) => (
                      <tr key={`${item.student.id}-${item.submission?.id ?? "empty"}`}>
                        <td className="px-4 py-3 font-mono">{item.student.nim}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentProfileId(item.student.id)}
                            className="font-medium text-blue-700 hover:text-blue-900 hover:underline text-left focus:outline-none"
                          >
                            {item.student.fullname}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.submission?.attemptType === "remedial"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            {formatAttemptLabel(item.submission)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span>{getEvaluationStatus(item.submission)}</span>
                            {item.submission?.isAutoSubmitted && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 mt-1">
                                Dikumpulkan Otomatis
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{centralFormatScore(item.submission?.score)}</td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {centralFormatScore(item.submission?.calculatedProgressScore ?? item.submission?.scoreBreakdown?.progressScore)}
                        </td>
                        <td className="px-4 py-3 text-center">{centralFormatScore(item.submission?.review?.finalScore)}</td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const isSubmitted = item.submission && ["SUBMITTED", "REVIEWED", "ACCEPTED", "REVISION", "REVIEWING"].includes(item.submission.status)
                            return (
                              <button
                                type="button"
                                disabled={!isSubmitted}
                                title={!isSubmitted ? "Mahasiswa belum mengumpulkan jobsheet" : undefined}
                                className="font-semibold text-blue-700 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                  if (!isSubmitted || !item.submission) return
                                  const params = new URLSearchParams({ courseId, classId, jobsheetId: jobsheet.id })
                                  if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
                                  if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
                                  if (item.submission?.id) params.set("submissionId", item.submission.id)
                                  if (item.submission?.attemptNo) params.set("attemptNo", String(item.submission.attemptNo))
                                  if (item.submission?.attemptType) params.set("attemptType", item.submission.attemptType)
                                  if (item.submission?.remedialId) params.set("remedialId", item.submission.remedialId)
                                  params.set("from", "evaluation")
                                  navigate(`/reviews/${item.student.id}?${params.toString()}`)
                                }}
                              >
                                Review
                              </button>
                            )
                          })()}
                        </td>
                      </tr>
                    ))}
                  </LecturerTable>
                )}
              </div>
            )}

            {activeTab === "remedial" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Sesi Remedial</h3>
                    <p className="text-xs text-gray-500 mt-1">Daftar sesi remedial yang dibuat untuk kelas praktikum ini.</p>
                  </div>
                  <LecturerButton onClick={() => setIsRemedialModalOpen(true)}>
                    Buat Sesi Remedial
                  </LecturerButton>
                </div>

                {loadingRemedials ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <span className="text-sm font-semibold text-gray-600">Memuat sesi remedial...</span>
                  </div>
                ) : remedials.length === 0 ? (
                  <LecturerEmptyState title="Belum ada sesi remedial untuk jobsheet ini." />
                ) : (
                  <div className="grid gap-6 md:grid-cols-[1fr_320px] items-start">
                    <div className="space-y-4">
                      <LecturerTable headers={["Mulai", "Selesai", "Status", "Aksi"]}>
                        {remedials.map((rem) => {
                          const isSelected = selectedRemedialId === rem.id
                          return (
                            <tr key={rem.id} className={isSelected ? "bg-blue-50/40" : ""}>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {formatAcademicTableDateTime(rem.startAt)}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {formatAcademicTableDateTime(rem.endAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  rem.status === "open" ? "bg-green-100 text-green-800" :
                                  rem.status === "closed" ? "bg-amber-100 text-amber-800" :
                                  rem.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                                }`}>
                                  {rem.status === "open" ? "Aktif" : rem.status === "closed" ? "Tutup" : rem.status === "cancelled" ? "Dibatalkan" : "Draft"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRemedialId(rem.id)}
                                    className={`text-xs font-bold px-3 py-1 rounded-md transition duration-150 ${
                                      isSelected
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    }`}
                                  >
                                    Detail Peserta
                                  </button>
                                  {rem.status !== "cancelled" && (
                                    <button
                                      type="button"
                                      onClick={() => setCancelRemedialTarget(rem)}
                                      className="text-xs font-bold px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition duration-150"
                                    >
                                      Batalkan
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </LecturerTable>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <h4 className="font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-4">
                        Daftar Peserta Remedial
                      </h4>
                      {!selectedRemedialId ? (
                        <p className="text-xs text-gray-500 text-center py-6">Pilih sesi remedial untuk melihat daftar peserta.</p>
                      ) : loadingRemedialStudents ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                      ) : remedialStudents.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-6">Belum ada peserta terdaftar.</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {remedialStudents.map((std) => (
                            <div key={std.id} className="p-3 rounded-lg border border-gray-100 bg-slate-50 flex flex-col gap-1.5">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-gray-800 text-xs truncate max-w-[150px]">{std.fullname}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  std.status === "reviewed" ? "bg-green-100 text-green-800" :
                                  std.status === "submitted" ? "bg-amber-100 text-amber-800" :
                                  std.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                                }`}>
                                  {std.status === "reviewed" ? "Dinilai" :
                                   std.status === "submitted" ? "Terkumpul" :
                                   std.status === "in_progress" ? "Progress" : "Daftar"}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">NIM: {std.nim || "-"}</div>
                              {std.submission_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const params = new URLSearchParams({ courseId, classId, jobsheetId })
                                    if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
                                    if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
                                    if (std.submission_id) params.set("submissionId", std.submission_id)
                                    if (std.attempt_no) params.set("attemptNo", String(std.attempt_no))
                                    params.set("attemptType", "remedial")
                                    if (selectedRemedialId) params.set("remedialId", selectedRemedialId)
                                    params.set("from", "monitoring")
                                    navigate(`/reviews/${std.student_id}?${params.toString()}`)
                                  }}
                                  className="mt-1 text-center font-bold text-[10px] text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 py-1 rounded transition duration-150"
                                >
                                  Review (Attempt {std.attempt_no})
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings panel has been removed */}
           </LecturerPanel>
         </>
       )}

      {/* DETAILED STUDENT PROGRESS LOGS MODAL */}
      {selectedStudentId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {studentDetail?.student.fullname.slice(0, 2).toUpperCase() ?? "??"}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{studentDetail?.student.fullname ?? "Memuat..."}</h3>
                  <p className="text-xs font-mono text-gray-500">NIM: {studentDetail?.student.nim ?? "-"} | {studentDetail?.student.email ?? "-"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition duration-150"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <span className="text-sm font-semibold text-gray-600">Memuat riwayat aktivitas mahasiswa...</span>
                </div>
              ) : studentDetail ? (
                <>
                  {/* Summary Block */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                    <div className="text-center md:text-left">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</span>
                      <div className="mt-1">
                        {renderStatusBadge(studentDetail.progress.status)}
                      </div>
                    </div>
                    <div className="text-center md:text-left">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kemajuan</span>
                      <span className="block mt-1 font-bold text-gray-800 text-lg">
                        {Math.round(studentDetail.progress.progress_percentage)}%
                      </span>
                    </div>
                    <div className="text-center md:text-left">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Langkah Selesai</span>
                      <span className="block mt-1 font-bold text-gray-800 text-lg">
                        {studentDetail.progress.completed_steps} / {studentDetail.progress.total_steps}
                      </span>
                    </div>
                    <div className="text-center md:text-left">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mulai Mengerjakan</span>
                      <span className="block mt-1 font-semibold text-gray-700 text-sm">
                        {studentDetail.progress.first_opened_at ? formatAcademicDateTime(studentDetail.progress.first_opened_at) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                      <Activity size={16} className="text-blue-600" />
                      Log Riwayat Aktivitas ({studentDetail.logs.length})
                    </h4>
                    
                    {!studentDetail.logs.length ? (
                      <p className="text-center text-sm text-gray-500 py-6">Belum ada rekaman aktivitas.</p>
                    ) : (
                      <div className="relative border-l border-blue-100 ml-3.5 pl-6 space-y-6">
                        {studentDetail.logs.map((log, idx) => {
                          let IconComp = BookOpen
                          let iconColor = "bg-blue-100 text-blue-700 border-blue-200"
                          if (log.activity_type.startsWith("complete_") || log.activity_type === "submit_answer") {
                            IconComp = UserCheck
                            iconColor = "bg-emerald-100 text-emerald-700 border-emerald-200"
                          } else if (log.activity_type === "run_code") {
                            IconComp = PlayCircle
                            iconColor = "bg-indigo-100 text-indigo-700 border-indigo-200"
                          } else if (log.activity_type === "save_code") {
                            IconComp = Save
                            iconColor = "bg-teal-100 text-teal-700 border-teal-200"
                          }

                          return (
                            <div key={idx} className="relative">
                              <span className={`absolute -left-[39px] top-0.5 flex items-center justify-center w-7 h-7 rounded-full border-2 ${iconColor} z-10 shadow-sm bg-white`}>
                                <IconComp size={14} />
                              </span>
                              
                              <div className="bg-slate-50 hover:bg-slate-100/75 transition duration-150 p-3.5 rounded-lg border border-slate-200/50">
                                <p className="text-sm font-semibold text-gray-800 leading-tight">
                                  {log.description}
                                </p>
                                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatRelativeTime(log.created_at)}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {formatAcademicTime(log.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-red-500">Gagal mengambil detail progress mahasiswa.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 hover:text-gray-900 transition duration-150"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedStudentProfileId && (
        <StudentProfileModal
          studentId={selectedStudentProfileId}
          onClose={() => setSelectedStudentProfileId(null)}
        />
      )}

      {/* CREATE REMEDIAL MODAL */}
      {isRemedialModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateRemedialSubmit}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-905 text-base">Buat Sesi Remedial: {jobsheet?.title}</h3>
              <button
                type="button"
                onClick={() => setIsRemedialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition duration-150"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <p className="mb-4 text-xs text-gray-500">Semua waktu menggunakan WIB (Asia/Jakarta).</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Waktu Mulai Remedial</p>
                  <IndonesianDateTimePicker
                    value={remStartDateTime}
                    onChange={setRemStartDateTime}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Waktu Berakhir Remedial</p>
                  <IndonesianDateTimePicker
                    value={remEndDateTime}
                    onChange={setRemEndDateTime}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold text-gray-700 block">Pilih Mahasiswa</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-[min(240px,32vh)] overflow-y-auto space-y-2">
                  {matrix.map((item) => {
                    const student = item.student
                    const isChecked = remSelectedStudentIds.includes(student.id)
                    const score = item.submission?.review?.finalScore ?? item.submission?.score
                    return (
                      <label key={student.id} className="flex items-center justify-between text-sm text-gray-700 hover:bg-slate-50 p-1 rounded cursor-pointer select-none">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRemSelectedStudentIds((prev) => [...prev, student.id])
                              } else {
                                setRemSelectedStudentIds((prev) => prev.filter((id) => id !== student.id))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{student.fullname} <span className="text-xs text-gray-400">({student.nim})</span></span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          score === null || score === undefined ? "bg-gray-100 text-gray-600" :
                          score >= 75 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          Nilai: {formatNumber(score)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsRemedialModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition duration-150"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingRemedial}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition duration-150 flex items-center gap-2"
              >
                {savingRemedial && <Loader2 size={16} className="animate-spin" />}
                Buat Sesi
              </button>
            </div>
          </form>
        </div>
      )}
      {cancelRemedialTarget && (
        <LecturerModal
          title="Batalkan Sesi Remedial?"
          onClose={() => {
            if (!cancellingRemedial) setCancelRemedialTarget(null)
          }}
          size="sm"
          footer={
            <>
              <LecturerButton
                variant="secondary"
                onClick={() => setCancelRemedialTarget(null)}
                disabled={cancellingRemedial}
              >
                Kembali
              </LecturerButton>
              <LecturerButton
                variant="danger"
                onClick={handleConfirmCancelRemedial}
                disabled={cancellingRemedial}
              >
                {cancellingRemedial && <Loader2 size={16} className="animate-spin" />}
                {cancellingRemedial ? "Membatalkan..." : "Ya, Batalkan Sesi"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p>Sesi remedial ini akan dibatalkan.</p>
              <p>Mahasiswa peserta tidak lagi dapat mengerjakan remedial ini.</p>
              <p>Pengerjaan, submission, nilai, dan riwayat remedial yang sudah tersimpan tidak akan dihapus.</p>
            </div>
            <dl className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <dt className="font-semibold text-gray-600">Jobsheet:</dt>
                <dd className="font-medium text-gray-900">{jobsheet?.title || cancelRemedialTarget.title}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <dt className="font-semibold text-gray-600">Mulai:</dt>
                <dd>{formatAcademicDateTime(cancelRemedialTarget.startAt)}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <dt className="font-semibold text-gray-600">Berakhir:</dt>
                <dd>{formatAcademicDateTime(cancelRemedialTarget.endAt)}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <dt className="font-semibold text-gray-600">Peserta:</dt>
                <dd>{cancelRemedialTarget.participantCount ?? cancelRemedialTarget.participant_count ?? (selectedRemedialId === cancelRemedialTarget.id ? remedialStudents.length : 0)} mahasiswa</dd>
              </div>
            </dl>
          </div>
        </LecturerModal>
      )}

      <LecturerChatDrawer
        isOpen={isLecturerChatOpen}
        onClose={() => {
          setIsLecturerChatOpen(false)
          setSelectedChatStudent(null)
        }}
        kelasPraktikumId={kelasPraktikumId || classId || ""}
        jobsheetId={jobsheetId || ""}
        studentId={selectedChatStudent?.id}
        studentName={selectedChatStudent?.name}
        onOpenChat={(targetStudentId) => {
          if (targetStudentId) {
            setSelectedChatStudent({ id: targetStudentId, name: "" })
          }
          setIsLecturerChatOpen(true)
        }}
      />
    </LecturerLayout>
   )
 }

