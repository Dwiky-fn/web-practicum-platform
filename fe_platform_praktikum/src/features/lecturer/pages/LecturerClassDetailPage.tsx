import { useEffect, useMemo, useState } from "react"
import StudentProfileModal from "../components/StudentProfileModal"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  ProgressBar,
  SearchBox,
  StatCard,
  TabButton,
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
  { id: "summary", label: "Ringkasan Kelas Praktikum" },
  { id: "modules", label: "Jobsheet" },
  { id: "students", label: "Mahasiswa" },
  { id: "evaluation", label: "Evaluasi & Nilai" },
]

export default function LecturerClassDetailPage() {
  const navigate = useNavigate()
  const { goBackToParent } = useBackNavigation()
  const { courseId = "", classId = "" } = useParams()
  const [searchParams] = useSearchParams()
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
  })
  const [jobsheets, setJobsheets] = useState<LecturerJobsheetSummary[]>([])
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])
  const [nativeScope, setNativeScope] = useState<{ mataKuliahId?: string; kelasPraktikumId?: string }>({})
  const [deleteTarget, setDeleteTarget] = useState<LecturerJobsheetSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function loadClassData() {
      if (!classId) return

      setLoading(true)
      setError("")

      try {
        const classDetail = await getLecturerClassDetail(classId)
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
        })
        setJobsheets(summaries)
        setMatrix(submissionMatrix)
        setNativeScope({ mataKuliahId, kelasPraktikumId })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail kelas.")
      } finally {
        setLoading(false)
      }
    }

    loadClassData()
  }, [classId, refreshTrigger])

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
    const students = Array.from(
      new Map(matrix.map((item) => [item.student.id, item.student])).values(),
    )

    return students.filter((student) => {
      const matchKeyword =
        !normalized ||
        [student.nim, student.fullname].some((value) => value.toLowerCase().includes(normalized))

      if (!matchKeyword) return false

      if (jobsheetFilter === "all") return true

      return matrix.some(
        (item) =>
          item.student.id === student.id &&
          item.jobsheet.id === jobsheetFilter,
      )
    })
  }, [jobsheetFilter, keyword, matrix])

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

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <button
        type="button"
        onClick={() => {
          goBackToParent({
            parentPath: "/mata-kuliah",
            fallbackPath: "/mata-kuliah",
          })
        }}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title={header.courseName || "Detail Kelas Praktikum"}
        subtitle={`Kelas Praktikum ${header.className || "-"} - Semester ${header.semester || "-"} - ${header.period || "-"}`}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!matrix.length && !jobsheets.length ? (
        <LecturerEmptyState title="Kelas praktikum ini belum memiliki data mahasiswa atau jobsheet." />
      ) : (
        <>
          <TabButton tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <LecturerPanel className="rounded-t-none p-5">
            {activeTab === "summary" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Total Mahasiswa" value={header.studentCount} />
                  <StatCard label="Jobsheet Aktif" value={jobsheets.filter((item) => item.status === "Published").length} />
                  <StatCard
                    label="Belum Direview"
                    value={matrix.filter((item) => getSubmissionReviewStatus(item.submission) === "Terkumpul").length}
                    caption="Laporan"
                  />
                </div>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Progress Evaluasi Laporan</h2>
                  <ProgressBar value={submittedCount ? Math.round((acceptedCount / submittedCount) * 100) : 0} />
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-3 text-lg font-semibold">Aktivitas Mahasiswa Terbaru</h2>
                  {!latestActivities.length ? (
                    <p className="text-sm text-gray-500">Belum ada aktivitas submission pada kelas ini.</p>
                  ) : (
                    <ul className="space-y-2 text-sm text-gray-700">
                      {latestActivities.map((item) => {
                        const jobsheet = jobsheets.find((current) => current.id === item.jobsheet.id)
                        return (
                          <li key={`${item.student.id}-${item.jobsheet.id}`}>
                            {item.student.fullname} memperbarui Jobsheet {jobsheet?.number ?? "-"} pada {new Date(item.submission?.updatedAt ?? "").toLocaleString("id-ID")}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </LecturerPanel>
              </div>
            )}

            {activeTab === "modules" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <LecturerButton onClick={() => navigate(`/mata-kuliah/${nativeScope.mataKuliahId || courseId}/jobsheets/create`)}>
                    <Plus size={16} />
                    Tambah Jobsheet
                  </LecturerButton>
                  <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
                    <option value="all">Semua Status</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Arsip">Arsip</option>
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet" />
                </div>

                {!filteredJobsheets.length ? (
                  <LecturerEmptyState title="Belum ada jobsheet yang cocok dengan filter." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredJobsheets.map((jobsheet) => (
                      <LecturerPanel key={jobsheet.id} className="p-5">
                        <h2 className="text-lg font-semibold">Jobsheet {jobsheet.number} - {jobsheet.title}</h2>
                        <p className="mt-1 text-sm text-gray-600">Status: {jobsheet.status}</p>
                        <p className="mt-4 text-sm text-gray-700">Submit: {jobsheet.submitted}/{jobsheet.total} Mahasiswa</p>
                        <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline}</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <LecturerButton
                            variant="secondary"
                            onClick={() => {
                              const params = new URLSearchParams({ courseId, classId, jobsheetId: jobsheet.id })
                              if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                              if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                              navigate(`/jobsheets/${jobsheet.id}?${params.toString()}`)
                            }}
                          >
                            Lihat Detail
                          </LecturerButton>
                          <LecturerButton
                            variant="secondary"
                            onClick={() => {
                              const params = new URLSearchParams({ courseId, classId })
                              if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                              if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                              navigate(`/mata-kuliah/${nativeScope.mataKuliahId || courseId}/jobsheets/${jobsheet.id}/edit?${params.toString()}`)
                            }}
                          >
                            Edit
                          </LecturerButton>
                          <LecturerButton variant="secondary" onClick={() => setDeleteTarget(jobsheet)}>
                            <Trash2 size={16} />
                            Hapus
                          </LecturerButton>
                        </div>
                      </LecturerPanel>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "students" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="">
                    <option value="all">Semua Jobsheet</option>
                    {jobsheets.map((jobsheet) => (
                      <option key={jobsheet.id} value={jobsheet.id}>Jobsheet {jobsheet.number}</option>
                    ))}
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
                </div>

                <LecturerTable headers={["NIM", "Nama", "Laporan", "Aksi"]}>
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
                      <tr key={student.id}>
                        <td className="px-4 py-3 font-mono">{student.nim}</td>
                        <td className="px-4 py-3">{student.fullname}</td>
                        <td className="px-4 py-3 text-center">{reportCount}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:text-blue-900"
                            onClick={() => setSelectedStudentProfileId(student.id)}
                          >
                            Profile
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
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="">
                    <option value="all">Semua Jobsheet</option>
                    {jobsheets.map((jobsheet) => (
                      <option key={jobsheet.id} value={jobsheet.id}>Jobsheet {jobsheet.number}</option>
                    ))}
                  </NativeSelect>
                  <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
                    <option value="all">Semua Status</option>
                    <option value="Terkumpul">Terkumpul</option>
                    <option value="Dinilai">Dinilai</option>
                    <option value="Revisi">Revisi</option>
                    <option value="Belum">Belum</option>
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
                </div>

                <LecturerTable headers={["NIM", "Nama", "Jobsheet", "Nilai AI", "Nilai Akhir", "Aksi"]}>
                  {evaluationRows.map((student) => {
                    const selectedSubmission =
                      jobsheetFilter === "all"
                        ? getLatestSubmissionForStudent(student.id, matrix)
                        : matrix.find(
                            (item) => item.student.id === student.id && item.jobsheet.id === jobsheetFilter,
                          ) ?? null
                    const selectedJobsheet = jobsheets.find((item) => item.id === selectedSubmission?.jobsheet.id)

                    return (
                      <tr key={student.id}>
                        <td className="px-4 py-3 font-mono">{student.nim}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentProfileId(student.id)}
                            className="font-medium text-blue-700 hover:text-blue-900 hover:underline text-left"
                          >
                            {student.fullname}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {selectedJobsheet ? selectedJobsheet.number : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">{selectedSubmission?.submission?.score ?? "-"}</td>
                        <td className="px-4 py-3 text-center">{selectedSubmission?.submission?.review?.finalScore ?? "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {selectedSubmission ? (
                            <button
                              type="button"
                              className="font-semibold text-blue-700 hover:text-blue-900"
                              onClick={() =>
                                {
                                  const params = new URLSearchParams({
                                    courseId,
                                    classId,
                                    jobsheetId: selectedSubmission.jobsheet.id,
                                  })
                                  if (nativeScope.mataKuliahId) params.set("mataKuliahId", nativeScope.mataKuliahId)
                                  if (nativeScope.kelasPraktikumId) params.set("kelasPraktikumId", nativeScope.kelasPraktikumId)
                                  navigate(`/reviews/${student.id}?${params.toString()}`)
                                }
                              }
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </LecturerTable>
              </div>
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
      {deleteTarget && (
        <LecturerModal
          title="Hapus Jobsheet"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</LecturerButton>
              <LecturerButton disabled={deleting} onClick={handleDeleteJobsheet}>
                {deleting ? "Menghapus..." : "Hapus"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Jobsheet <span className="font-semibold">{deleteTarget.title}</span> akan dihapus.
            </p>
            <p>
              Jobsheet hanya bisa dihapus jika belum digunakan di kelas mana pun.
            </p>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
