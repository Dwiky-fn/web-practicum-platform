import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Activity,
  BookOpen,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  Save,
  X,
  UserCheck
} from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import StudentProfileModal from "../components/StudentProfileModal"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import type { Jobsheet } from "../../../services/jobsheet/types"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  SearchBox,
  TabButton,
} from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerJobsheetById,
  getLecturerSubmissionMatrix,
  getSubmissionReviewStatus,
  getLecturerClassProgress,
  getLecturerStudentDetailProgress,
  type LecturerSubmissionMatrixItem,
  type LecturerClassProgressResponse,
  type LecturerStudentDetailProgressResponse,
} from "../service"
import { academicCourseBasePath } from "../../../services/academicScope"

type DetailTab = "detail" | "monitoring" | "students" | "settings"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "detail", label: "Konten Jobsheet" },
  { id: "monitoring", label: "Monitoring Mahasiswa" },
  { id: "students", label: "Evaluasi & Nilai" },
  { id: "settings", label: "Pengaturan" },
]

export default function LecturerJobsheetDetailPage() {
  const navigate = useNavigate()
  const { jobsheetId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId") ?? ""
  const classId = searchParams.get("classId") ?? ""
  const mataKuliahId = searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const nativeScope = useMemo(() => ({ mataKuliahId, kelasPraktikumId }), [kelasPraktikumId, mataKuliahId])
  const jobsheetBasePath = `${academicCourseBasePath(courseId, nativeScope)}/jobsheets`
  const [activeTab, setActiveTab] = useState<DetailTab>("detail")
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])

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
        console.error("Gagal memuat monitoring progress:", err)
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
        console.error("Gagal memuat detail progress mahasiswa:", err)
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

  function formatTime(timestamp?: string | null) {
    if (!timestamp) return "-"
    const date = new Date(timestamp)
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  function formatRelativeTime(timestamp?: string | null) {
    if (!timestamp) return "-"
    const diffMs = new Date().getTime() - new Date(timestamp).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Baru saja"
    if (diffMins < 60) return `${diffMins} menit lalu`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} jam lalu`
    return new Date(timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  }

  function renderStatusBadge(status: "not_started" | "in_progress" | "stalled" | "completed") {
    const styles = {
      not_started: "bg-gray-100 text-gray-700 border-gray-200",
      in_progress: "bg-blue-50 text-blue-700 border-blue-100",
      stalled: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    }
    
    const labels = {
      not_started: "Belum Mulai",
      in_progress: "Mengerjakan",
      stalled: "Terhambat",
      completed: "Selesai",
    }
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          status === "not_started" ? "bg-gray-500" :
          status === "in_progress" ? "bg-blue-500" :
          status === "stalled" ? "bg-amber-500" : "bg-emerald-500"
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
        } else {
          setMatrix([])
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail jobsheet.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId, courseId, jobsheetId, kelasPraktikumId, mataKuliahId, nativeScope])

  const filteredStudents = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return matrix.filter((item) => {
      const matchKeyword =
        !normalized ||
        [item.student.fullname, item.student.nim].some((value) => value.toLowerCase().includes(normalized))
      const reviewStatus = getSubmissionReviewStatus(item.submission)
      const matchStatus = status === "all" || reviewStatus === status

      return matchKeyword && matchStatus
    })
  }, [keyword, matrix, status])

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title={jobsheet ? `Detail Jobsheet ${jobsheet.title}` : "Detail Jobsheet"}
        subtitle={jobsheet ? `${jobsheet.programmingLanguageDisplayName} - Status: ${jobsheet.status}` : undefined}
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
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
                              <code>{item.defaultTemplateCode}</code>
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
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
                              <code>{item.defaultTemplateCode}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada latihan praktikum.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Tugas Praktikum</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-800">Percobaan untuk laporan</p>
                      <div className="space-y-2 text-sm">
                        {jobsheet.experiments.map((item) => (
                          <label key={item.id} className="flex items-center gap-3">
                            <input type="checkbox" checked={item.isReported} readOnly />
                            <span>{item.title} ({item.rubric ?? 0}%)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-800">Latihan untuk laporan</p>
                      <div className="space-y-2 text-sm">
                        {jobsheet.exercises.map((item) => (
                          <label key={item.id} className="flex items-center gap-3">
                            <input type="checkbox" checked={item.isReported} readOnly />
                            <span>{item.title} ({item.rubric ?? 0}%)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <RichTextViewer
                      content={jobsheet.task.instructionContent ?? { type: "doc", content: [] }}
                      role="DOSEN"
                      mode="viewer-default"
                    />
                  </div>
                </LecturerPanel>

                <LecturerButton onClick={() => navigate(`${jobsheetBasePath}/${jobsheet.id}/edit`)}>
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
                      <span className="text-xs font-semibold uppercase tracking-wider">Terhambat</span>
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
                          console.error(e)
                        } finally {
                          setLoadingMonitoring(false)
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition duration-150"
                      title="Perbarui Data"
                    >
                      <RefreshCw size={16} className={loadingMonitoring ? "animate-spin" : ""} />
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
                        <option value="stalled">Terhambat</option>
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
                        <option value="progress_desc">Progress Terbanyak</option>
                        <option value="progress_asc">Progress Terkecil</option>
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
                        <td className="px-4 py-3">{renderStatusBadge(student.status)}</td>
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
                        <td className="px-4 py-3 text-xs text-gray-600" title={student.last_activity_at ? new Date(student.last_activity_at).toLocaleString("id-ID") : "-"}>
                          {formatRelativeTime(student.last_activity_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs transition duration-150"
                            onClick={() => setSelectedStudentId(student.student_id)}
                          >
                            Detail Log
                          </button>
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
                    <option value="Terkumpul">Terkumpul</option>
                    <option value="Dinilai">Dinilai</option>
                    <option value="Revisi">Revisi</option>
                    <option value="Belum">Belum</option>
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
                </div>

                {!filteredStudents.length ? (
                  <LecturerEmptyState title="Belum ada data submission mahasiswa untuk jobsheet ini." />
                ) : (
                  <LecturerTable headers={["NIM", "Nama", "Status", "Nilai AI", "Nilai Akhir", "Aksi"]}>
                    {filteredStudents.map((item) => (
                      <tr key={item.student.id}>
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
                        <td className="px-4 py-3">{getSubmissionReviewStatus(item.submission)}</td>
                        <td className="px-4 py-3 text-center">{item.submission?.score ?? "-"}</td>
                        <td className="px-4 py-3 text-center">{item.submission?.review?.finalScore ?? "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:text-blue-900"
                            onClick={() => {
                              const params = new URLSearchParams({ courseId, classId, jobsheetId: jobsheet.id })
                              if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
                              if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
                              navigate(`/reviews/${item.student.id}?${params.toString()}`)
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </LecturerTable>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <LecturerPanel className="p-5">
                  <h2 className="mb-3 text-lg font-semibold">Status Jobsheet</h2>
                  <p className="text-sm text-gray-700">Status saat ini: {jobsheet.status}</p>
                  <div className="mt-4">
                    <LecturerButton onClick={() => navigate(jobsheetBasePath)}>
                      Buka Pengaturan Publikasi
                    </LecturerButton>
                  </div>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                   <h2 className="mb-4 text-lg font-semibold">Konfigurasi Penilaian</h2>
                   <p className="text-sm text-gray-600">
                     Kesimpulan akhir: {jobsheet.task.conclusionConfig?.required ? "Wajib" : "Opsional"}
                   </p>
                   <p className="text-sm text-gray-600">
                     Minimal kata: {jobsheet.task.conclusionConfig?.minWord ?? 150}
                   </p>
                   <p className="text-sm text-gray-600">
                     Pernyataan mandiri: {jobsheet.task.requireSelfDeclaration ? "Aktif" : "Tidak aktif"}
                   </p>
                 </LecturerPanel>
               </div>
             )}
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
                        {studentDetail.progress.first_opened_at ? new Date(studentDetail.progress.first_opened_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " " + formatTime(studentDetail.progress.first_opened_at) : "-"}
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
                                    {new Date(log.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
     </LecturerLayout>
   )
 }
