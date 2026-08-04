import { useEffect, useMemo, useState } from "react"
import StudentProfileModal from "../components/StudentProfileModal"
import { BookOpen, CheckCircle, Clock, Eye, FileCheck, Layers, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { apiFetch } from "../../../services/api"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import { formatAcademicDateTime } from "../../../shared/utils/formatAcademicDateTime"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerTable,
  NativeSelect,
  SearchBox,
  LecturerModal,
} from "../components/LecturerUI"
import {
  buildLecturerJobsheetSummaries,
  getLatestSubmissionForStudent,
  getLecturerClassDetail,
  getLecturerSubmissionMatrix,
  getStudentReportCount,
  getSubmissionReviewStatus,
  isSubmittedSubmission,
  deleteLecturerJobsheet,
  type LecturerJobsheetSummary,
  type LecturerSubmissionMatrixItem,
} from "../service"
import { toast } from "../../../components/toast/toastStore"

type ClassTab = "summary" | "modules" | "students" | "evaluation"

const tabs: Array<{ id: ClassTab; label: string }> = [
  { id: "summary", label: "Ringkasan Kelas" },
  { id: "modules", label: "Jobsheet Praktikum" },
  { id: "students", label: "Daftar Mahasiswa" },
  { id: "evaluation", label: "Evaluasi & Nilai" },
]

export default function LecturerClassDetailPage() {
  const navigate = useNavigate()
  const { goBackToParent } = useBackNavigation()
  const { courseId = "", classId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const isHistoryScope = searchParams.get("scope") === "history"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<ClassTab>(() => {
    const queryTab = searchParams.get("tab") as ClassTab
    if (queryTab && ["summary", "modules", "students", "evaluation"].includes(queryTab)) return queryTab
    const savedTab = sessionStorage.getItem(`activeTab_class_${classId}`) as ClassTab
    if (savedTab && ["summary", "modules", "students", "evaluation"].includes(savedTab)) {
      return savedTab
    }
    return "summary"
  })

  useEffect(() => {
    if (classId) {
      sessionStorage.setItem(`activeTab_class_${classId}`, activeTab)
    }
  }, [activeTab, classId])

  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [jobsheetFilter, setJobsheetFilter] = useState("all")
  const [header, setHeader] = useState({
    courseName: "",
    className: "",
    semester: 0,
    period: "",
    studentCount: 0,
    jobsheetPlan: 1,
    jobsheetCreated: 0,
    jobsheetPublished: 0,
  })
  const [jobsheets, setJobsheets] = useState<LecturerJobsheetSummary[]>([])
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [nativeScope, setNativeScope] = useState<{ mataKuliahId?: string; kelasPraktikumId?: string }>({})
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false)
  const [editPlanValue, setEditPlanValue] = useState("1")
  const [savingPlan, setSavingPlan] = useState(false)

  async function handleSaveJobsheetPlan() {
    if (!classId) return
    try {
      setSavingPlan(true)
      await apiFetch(`/lecturer/kelas-praktikum/${classId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({
          jumlah_jobsheet_rencana: Number(editPlanValue || 1),
        }),
      })
      setHeader((prev) => ({ ...prev, jobsheetPlan: Number(editPlanValue || 1) }))
      setIsEditPlanModalOpen(false)
      toast.success("Jumlah jobsheet rencana berhasil diperbarui.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui jumlah jobsheet rencana.")
    } finally {
      setSavingPlan(false)
    }
  }
  const [deleteTarget, setDeleteTarget] = useState<LecturerJobsheetSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function loadClassData() {
      if (!classId) return

      setLoading(true)
      setError("")

      try {
        const classDetail = await getLecturerClassDetail(classId, isHistoryScope ? { scope: "history" } : {})
        const mataKuliahId = classDetail.mataKuliahId || classDetail.id_mata_kuliah || classDetail.courseId
        const kelasPraktikumId = classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum
        const submissionMatrix = await getLecturerSubmissionMatrix(
          classDetail.courseId,
          classDetail.jobsheets,
          classDetail.students,
          { mataKuliahId, kelasPraktikumId },
        )
        const summaries = buildLecturerJobsheetSummaries(
          classDetail.jobsheets,
          classDetail.students,
          submissionMatrix,
          classDetail.name,
          classDetail.id,
          kelasPraktikumId,
        ).map((item) => ({ ...item, courseId: classDetail.courseId }))

        setHeader({
          courseName: classDetail.courseName,
          className: classDetail.name,
          semester: classDetail.studentSemester,
          period: classDetail.semesterYear,
          studentCount: classDetail.students.length,
          jobsheetPlan: classDetail.jumlahJobsheetRencana ?? classDetail.jumlah_jobsheet_rencana ?? 1,
          jobsheetCreated: classDetail.jumlahJobsheetDibuat ?? classDetail.jumlah_jobsheet_dibuat ?? summaries.length,
          jobsheetPublished: classDetail.jumlahJobsheetPublish ?? classDetail.jumlah_jobsheet_publish ?? summaries.filter((item) => item.status === "Published").length,
        })
        setJobsheets(summaries)
        setMatrix(submissionMatrix)
        setClassStudents(classDetail.students || [])
        setNativeScope({ mataKuliahId, kelasPraktikumId })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail kelas.")
      } finally {
        setLoading(false)
      }
    }

    loadClassData()
  }, [classId, refreshTrigger, isHistoryScope])

  async function handleDeleteJobsheet() {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await deleteLecturerJobsheet(courseId, deleteTarget.id, {
        mataKuliahId: nativeScope.mataKuliahId,
        kelasPraktikumId: nativeScope.kelasPraktikumId,
      })
      toast.success("Jobsheet berhasil dihapus.")
      setDeleteTarget(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Gagal menghapus jobsheet.")
    } finally {
      setDeleting(false)
    }
  }

  const filteredJobsheets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return jobsheets
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => !normalized || item.title.toLowerCase().includes(normalized))
  }, [jobsheets, keyword, statusFilter])

  const studentRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const rawStudents = classStudents.length
      ? classStudents
      : Array.from(new Map(matrix.map((item) => [item.student.id, item.student])).values())

    return rawStudents.filter((student) => {
      const studentName = student.fullname || student.name || ""
      const matchKeyword =
        !normalized ||
        [student.nim, studentName].some((value) => String(value).toLowerCase().includes(normalized))

      if (!matchKeyword) return false

      if (jobsheetFilter === "all") return true

      return matrix.some(
        (item) =>
          item.student.id === student.id &&
          item.jobsheet.id === jobsheetFilter,
      )
    })
  }, [classStudents, jobsheetFilter, keyword, matrix])

  const evaluationRows = useMemo(() => {
    return studentRows.filter((student) => {
      const submissionItem =
        jobsheetFilter === "all"
          ? getLatestSubmissionForStudent(student.id, matrix)
          : matrix.find(
              (item) => item.student.id === student.id && item.jobsheet.id === jobsheetFilter,
            ) ?? null

      const status = getSubmissionReviewStatus(submissionItem?.submission ?? null)
      return statusFilter === "all" || status === statusFilter
    })
  }, [jobsheetFilter, matrix, statusFilter, studentRows])

  const submittedCount = matrix.filter((item) => isSubmittedSubmission(item.submission)).length
  const acceptedCount = matrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Dinilai",
  ).length
  const pendingCount = matrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Terkumpul",
  ).length

  const latestActivities = useMemo(
    () =>
      matrix
        .filter((item) => isSubmittedSubmission(item.submission))
        .sort((left, right) => {
          const leftTime = new Date(left.submission?.updatedAt ?? 0).getTime()
          const rightTime = new Date(right.submission?.updatedAt ?? 0).getTime()
          return rightTime - leftTime
        })
        .slice(0, 5),
    [matrix],
  )

  const evalPercentage = submittedCount ? Math.min(100, Math.round((acceptedCount / submittedCount) * 100)) : 0

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout
      onBack={() => {
        goBackToParent({
          parentPath: "/mata-kuliah",
          fallbackPath: "/mata-kuliah",
        })
      }}
    >



      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Hero Banner Panel */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Sparkles size={16} className="text-yellow-400" />
              Detail Kelas Praktikum Dosen
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">
              {header.courseName} • {header.className.includes(" - ") ? header.className.split(" - ").pop()?.trim() || header.className : header.className.replace(/^Kelas\s+/i, "")}
            </h2>
            <p className="text-xs text-blue-200">
              Semester {header.semester} • Periode Academic: {header.period}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white border border-white/10">
              {header.studentCount} Mahasiswa
            </span>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white border border-white/10">
              <span>{header.jobsheetPublished}/{header.jobsheetPlan} Jobsheet Terbit</span>
              {!isHistoryScope && (
                <button
                  type="button"
                  onClick={() => {
                    setEditPlanValue(String(header.jobsheetPlan || 1))
                    setIsEditPlanModalOpen(true)
                  }}
                  className="ml-1 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/30 transition-colors cursor-pointer"
                  title="Ubah Rencana Jobsheet"
                >
                  <Pencil size={12} />
                  Ubah Rencana
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!header.studentCount && !jobsheets.length ? (
        <LecturerEmptyState title="Kelas praktikum ini belum memiliki data mahasiswa atau jobsheet." />
      ) : (
        <>
          {/* Tab Button Menu Navigasi */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content berdasarkan Tab */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            {activeTab === "summary" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Mahasiswa</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Users size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-gray-900">{header.studentCount} Orang</p>
                    <p className="mt-1 text-xs text-gray-500">Terdaftar di kelas {header.className}</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Jobsheet Rencana</span>
                      <div className="flex items-center gap-1.5">
                        {!isHistoryScope && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditPlanValue(String(header.jobsheetPlan || 1))
                              setIsEditPlanModalOpen(true)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 transition-colors"
                            title="Ubah Jumlah Jobsheet Rencana"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <BookOpen size={18} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-gray-900">{header.jobsheetPlan} Jobsheet</p>
                    <p className="mt-1 text-xs text-gray-500">Target rencana 1 semester</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Belum Direview</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <FileCheck size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-gray-900">{pendingCount} Jobsheet</p>
                    <p className="mt-1 text-xs text-gray-500">Submissions menunggu evaluasi</p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Jobsheet Terbit</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <Layers size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-gray-900">{header.jobsheetPublished}/{header.jobsheetCreated}</p>
                    <p className="mt-1 text-xs text-gray-500">Dari total jobsheet dibuat</p>
                  </div>
                </div>

                {/* Progress Evaluasi Jobsheet */}
                <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600" /> Progres Evaluasi Jobsheet Kelas
                    </h3>
                    <span className="text-sm font-bold text-blue-700">{evalPercentage}% Selesai</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${evalPercentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {acceptedCount} dari {submittedCount} jobsheet terkumpul telah selesai dievaluasi oleh dosen.
                  </p>
                </div>

                {/* Timeline Aktivitas Mahasiswa */}
                <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                    <Clock size={18} className="text-purple-600" /> Aktivitas Pengumpulan Mahasiswa Terbaru
                  </h3>
                  {!latestActivities.length ? (
                    <p className="py-4 text-xs text-gray-500">Belum ada aktivitas submission pada kelas ini.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-gray-700">
                      {latestActivities.map((item) => {
                        const jobsheet = jobsheets.find((current) => current.id === item.jobsheet.id)
                        return (
                          <li key={`${item.student.id}-${item.jobsheet.id}`} className="flex items-center justify-between border-b border-gray-50 pb-2">
                            <div>
                              <strong className="text-gray-900">{item.student.fullname}</strong>
                              <span className="ml-2 text-gray-500">memperbarui Jobsheet {jobsheet?.number ?? "-"}</span>
                            </div>
                            <span className="font-semibold text-blue-700">{formatAcademicDateTime(item.submission?.updatedAt)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === "modules" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Daftar Jobsheet Kelas Praktikum</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Target Rencana: <strong className="text-blue-900 font-bold">{header.jobsheetPlan} Jobsheet</strong>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {!isHistoryScope && (
                      <>
                        <LecturerButton
                          variant="secondary"
                          onClick={() => {
                            setEditPlanValue(String(header.jobsheetPlan || 1))
                            setIsEditPlanModalOpen(true)
                          }}
                        >
                          <Pencil size={15} />
                          Atur Rencana Jobsheet
                        </LecturerButton>
                        <LecturerButton onClick={() => navigate(`/mata-kuliah/${nativeScope.mataKuliahId || courseId}/jobsheets/create`)}>
                          <Plus size={16} />
                          Tambah Jobsheet
                        </LecturerButton>
                      </>
                    )}
                    <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
                      <option value="all">Semua Status Jobsheet</option>
                      <option value="Published">Published (Terbit)</option>
                      <option value="Draft">Draft (Konsep)</option>
                      <option value="Nonaktif">Nonaktif</option>
                      <option value="Arsip">Arsip</option>
                    </NativeSelect>
                    <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet..." className="w-full sm:w-60" />
                  </div>
                </div>

                {!filteredJobsheets.length ? (
                  <LecturerEmptyState title="Belum ada jobsheet yang cocok dengan filter." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredJobsheets.map((jobsheet) => (
                      <div
                        key={jobsheet.id}
                        className="flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-base font-bold text-gray-900">
                              Jobsheet {jobsheet.number} - {jobsheet.title}
                            </h4>
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                              {jobsheet.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            Terumpul: <strong className="text-gray-900">{jobsheet.submitted}/{jobsheet.total} Mahasiswa</strong>
                          </p>
                          <p className="text-xs text-gray-600">Deadline: {jobsheet.deadline}</p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                          <LecturerButton
                            variant="secondary"
                            onClick={() => {
                              const params = new URLSearchParams({ courseId, classId, jobsheetId: jobsheet.id })
                              if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                              if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                              if (isHistoryScope) params.set("scope", "history")
                              navigate(`/jobsheets/${jobsheet.id}?${params.toString()}`)
                            }}
                          >
                            Lihat Detail
                          </LecturerButton>
                          {!isHistoryScope && (
                            <>
                              <LecturerButton
                                variant="secondary"
                                onClick={() => {
                                  const params = new URLSearchParams({ courseId, classId })
                                  if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                                  if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                                  navigate(`/mata-kuliah/${nativeScope.mataKuliahId || courseId}/jobsheets/${jobsheet.id}/edit?${params.toString()}`)
                                }}
                              >
                                Edit Isi
                              </LecturerButton>
                              <LecturerButton variant="secondary" onClick={() => setDeleteTarget(jobsheet)}>
                                <Trash2 size={15} className="text-red-500" />
                                Hapus
                              </LecturerButton>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "students" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-base font-bold text-gray-900">Daftar Mahasiswa Kelas Praktikum</h3>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="">
                      <option value="all">Semua Jobsheet</option>
                      {jobsheets.map((jobsheet) => (
                        <option key={jobsheet.id} value={jobsheet.id}>Jobsheet {jobsheet.number}</option>
                      ))}
                    </NativeSelect>
                    <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa..." className="w-full sm:w-60" />
                  </div>
                </div>

                <LecturerTable headers={["NIM", "Nama Mahasiswa", "Jobsheet Diselesaikan", "Profil"]}>
                  {studentRows.map((student) => {
                    const reportCount =
                      jobsheetFilter === "all"
                        ? `${getStudentReportCount(student.id, matrix)}/${jobsheets.length || 0}`
                        : `${
                            matrix.some(
                              (item) =>
                                item.student.id === student.id &&
                                item.jobsheet.id === jobsheetFilter &&
                                isSubmittedSubmission(item.submission),
                            )
                              ? 1
                              : 0
                          }/1`

                    return (
                      <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{student.nim}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{student.fullname}</td>
                        <td className="px-4 py-3.5 text-center text-xs font-bold text-blue-700">{reportCount} Jobsheet</td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                            onClick={() => setSelectedStudentProfileId(student.id)}
                          >
                            <Eye size={14} /> Lihat Profil
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </LecturerTable>
              </div>
            )}

            {activeTab === "evaluation" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-base font-bold text-gray-900">Evaluasi &amp; Penilaian Jobsheet</h3>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="">
                      <option value="all">Semua Jobsheet</option>
                      {jobsheets.map((jobsheet) => (
                        <option key={jobsheet.id} value={jobsheet.id}>Jobsheet {jobsheet.number}</option>
                      ))}
                    </NativeSelect>
                    <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
                      <option value="all">Semua Status Review</option>
                      <option value="Terkumpul">Terkumpul (Butuh Review)</option>
                      <option value="Dinilai">Dinilai (Selesai)</option>
                      <option value="Revisi">Revisi (Perlu Perbaikan)</option>
                      <option value="Belum">Belum Dikumpulkan</option>
                    </NativeSelect>
                    <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa..." className="w-full sm:w-60" />
                  </div>
                </div>

                <LecturerTable headers={["NIM", "Nama Mahasiswa", "Jobsheet", "Nilai AI", "Nilai Akhir", "Aksi Evaluasi"]}>
                  {evaluationRows.map((student) => {
                    const selectedSubmission =
                      jobsheetFilter === "all"
                        ? getLatestSubmissionForStudent(student.id, matrix)
                        : matrix.find(
                            (item) => item.student.id === student.id && item.jobsheet.id === jobsheetFilter,
                          ) ?? null
                    const selectedJobsheet = jobsheets.find((item) => item.id === selectedSubmission?.jobsheet.id)

                    return (
                      <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{student.nim}</td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentProfileId(student.id)}
                            className="font-semibold text-gray-900 hover:text-blue-700 hover:underline text-left text-sm"
                          >
                            {student.fullname}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs font-bold text-gray-800">
                          {selectedJobsheet ? `Jobsheet ${selectedJobsheet.number}` : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs font-mono text-gray-600">
                          {selectedSubmission?.submission?.score ?? "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs font-mono font-bold text-emerald-700">
                          {selectedSubmission?.submission?.review?.finalScore ?? "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {selectedSubmission?.submission && ["SUBMITTED", "REVIEWED", "ACCEPTED", "REVISION", "REVIEWING"].includes(selectedSubmission.submission.status) ? (
                            <LecturerButton
                              variant="secondary"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  courseId,
                                  classId,
                                  jobsheetId: selectedSubmission.jobsheet.id,
                                })
                                if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                                if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                                params.set("from", "class-evaluation")
                                navigate(`/reviews/${student.id}?${params.toString()}`)
                              }}
                            >
                              Review &amp; Nilai
                            </LecturerButton>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">Belum Submit</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </LecturerTable>
              </div>
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

      {deleteTarget && (
        <LecturerModal
          title="Konfirmasi Hapus Jobsheet"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</LecturerButton>
              <LecturerButton disabled={deleting} onClick={handleDeleteJobsheet}>
                {deleting ? "Menghapus..." : "Hapus Jobsheet"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Apakah Anda yakin ingin menghapus <strong>Jobsheet {deleteTarget.number} - {deleteTarget.title}</strong>?
            </p>
            <p className="text-xs text-gray-500">
              Jobsheet hanya bisa dihapus jika belum digunakan di kelas mana pun.
            </p>
          </div>
        </LecturerModal>
      )}

      {/* Modal Ubah Rencana Jobsheet */}
      {isEditPlanModalOpen && (
        <LecturerModal
          title="Ubah Jumlah Jobsheet Rencana"
          description={`Tentukan jumlah target jobsheet praktikum yang direncanakan untuk kelas ${header.className} selama 1 semester.`}
          onClose={() => setIsEditPlanModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <LecturerButton variant="secondary" onClick={() => setIsEditPlanModalOpen(false)}>
                Batal
              </LecturerButton>
              <LecturerButton onClick={handleSaveJobsheetPlan} disabled={savingPlan}>
                {savingPlan ? "Menyimpan..." : "Simpan Rencana"}
              </LecturerButton>
            </div>
          }
        >
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Jumlah Jobsheet Rencana</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold focus:border-blue-600 focus:outline-none"
              value={editPlanValue}
              onChange={(e) => setEditPlanValue(e.target.value)}
              placeholder="Contoh: 10"
            />
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
