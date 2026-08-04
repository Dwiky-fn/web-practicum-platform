import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileCheck,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
} from "lucide-react"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerModal,
  LecturerTable,
  NativeSelect,
} from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerCourseGroups,
  getLecturerSubmissionMatrix,
  isSubmittedSubmission,
  type LecturerCourseGroup,
  type LecturerSubmissionMatrixItem,
} from "../service"
import type { AdminStudent, ClassJobsheet } from "../../../services/admin/types"
import { formatDeadlineLocal } from "../utils/deadline"

interface ClassProgressItem {
  classId: string
  kelasPraktikumId: string
  className: string
  totalJobsheets: number
  publishedJobsheetCount: number
  students: AdminStudent[]
  jobsheets: ClassJobsheet[]
  submissionMatrix: LecturerSubmissionMatrixItem[]
}

export default function LecturerDashboardPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [classLoading, setClassLoading] = useState(false)
  const [error, setError] = useState("")
  const [courseGroups, setCourseGroups] = useState<LecturerCourseGroup[]>([])
  const [courseId, setCourseId] = useState("")
  const [classList, setClassList] = useState<ClassProgressItem[]>([])
  const [selectedClassModal, setSelectedClassModal] = useState<ClassProgressItem | null>(null)

  const selectedCourse = useMemo(
    () => courseGroups.find((item) => item.id === courseId) ?? null,
    [courseGroups, courseId],
  )

  useEffect(() => {
    async function loadCourses() {
      if (!user || user.role !== "DOSEN") return

      setLoading(true)
      setError("")

      try {
        const groups = await getLecturerCourseGroups({ scope: "active" })
        setCourseGroups(groups)

        if (groups.length > 0) {
          setCourseId((current) => current || groups[0].id)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat dashboard dosen.")
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [user])

  useEffect(() => {
    async function loadAllClassesData() {
      if (!selectedCourse || !selectedCourse.classes.length) {
        setClassList([])
        return
      }

      setClassLoading(true)
      setError("")

      try {
        const classItems: ClassProgressItem[] = await Promise.all(
          selectedCourse.classes.map(async (cls) => {
            const classDetail = await getLecturerClassDetail(cls.id)
            const mataKuliahId =
              classDetail.mataKuliahId ||
              classDetail.id_mata_kuliah ||
              selectedCourse.mataKuliahId ||
              selectedCourse.id
            const kelasPraktikumId =
              classDetail.kelasPraktikumId ||
              classDetail.id_kelas_praktikum ||
              cls.kelasPraktikumId ||
              cls.id_kelas_praktikum ||
              cls.id

            const submissionMatrix = await getLecturerSubmissionMatrix(
              classDetail.courseId,
              classDetail.jobsheets,
              classDetail.students,
              { mataKuliahId, kelasPraktikumId },
            )

            const totalJobsheets =
              classDetail.jumlahJobsheetRencana ||
              classDetail.jumlah_jobsheet_rencana ||
              (classDetail.jobsheets.length > 0 ? classDetail.jobsheets.length : 10)

            const publishedCount = classDetail.jobsheets.filter(
              (j) => j.status === "Aktif" || j.status === "Selesai",
            ).length

            return {
              classId: cls.id,
              kelasPraktikumId,
              className: cls.name,
              totalJobsheets,
              publishedJobsheetCount: publishedCount,
              students: classDetail.students,
              jobsheets: classDetail.jobsheets,
              submissionMatrix,
            }
          }),
        )

        classItems.sort((a, b) =>
          a.className.localeCompare(b.className, "id-ID", { numeric: true, sensitivity: "base" }),
        )

        setClassList(classItems)
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Gagal memuat data kelas praktikum.",
        )
      } finally {
        setClassLoading(false)
      }
    }

    loadAllClassesData()
  }, [selectedCourse])

  // Metrik Tambahan untuk Dashboard Cards:
  const totalStudentsCount = useMemo(
    () => classList.reduce((acc, cls) => acc + cls.students.length, 0),
    [classList],
  )

  const pendingReviewSubmissions = useMemo(() => {
    return classList.flatMap((cls) =>
      cls.submissionMatrix
        .filter((item) => {
          const sub = item.submission
          return Boolean(
            sub &&
              sub.status !== "DRAFT" &&
              ((sub.score === undefined || sub.score === null) && sub.status !== "ACCEPTED")
          )
        })
        .map((item) => ({ ...item, classId: cls.classId, className: cls.className })),
    )
  }, [classList])

  const totalPendingReviews = pendingReviewSubmissions.length

  const upcomingDeadlineJob = useMemo(() => {
    const allJobsheetsWithDeadline = classList
      .flatMap((cls) => cls.jobsheets.map((j) => ({ ...j, className: cls.className })))
      .filter(
        (j) => j.deadline && j.deadline !== "-" && new Date(j.deadline).getTime() >= Date.now(),
      )
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

    if (allJobsheetsWithDeadline.length === 0) return null
    return allJobsheetsWithDeadline[0]
  }, [classList])

  if (loading && !courseGroups.length) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>


      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!courseGroups.length ? (
        <LecturerEmptyState title="Belum ada kelas yang diampu pada semester aktif." />
      ) : (
        <>
          {/* Header Panel Filter: Pilih Mata Kuliah */}
          <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                  <Sparkles size={16} className="text-yellow-400" />
                  Mata Kuliah Aktif
                </div>
                <h2 className="text-xl font-bold text-white">
                  {selectedCourse?.name ?? "Pilih Mata Kuliah"}
                </h2>
                <p className="text-xs text-blue-200">
                  Periode Semester: {selectedCourse?.period ?? "Aktif"}
                </p>
              </div>

              <div className="w-full md:w-80">
                <NativeSelect
                  label="Pilih Mata Kuliah Diampu"
                  labelClassName="text-blue-100 font-bold"
                  value={courseId}
                  onChange={(value) => setCourseId(value)}
                  className="w-full text-gray-900"
                >
                  {courseGroups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>

          {/* Grid Cards Metrik Ringkasan Relevan dengan Quick Action */}
          <section className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Kelas Diampu */}
            <div className="group flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Kelas Diampu
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-transform group-hover:scale-110">
                    <BookOpen size={20} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">{classList.length} Kelas</p>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {classList.length ? `Kelas: ${classList.map((c) => c.className).join(", ")}` : "Belum ada kelas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/mata-kuliah/${selectedCourse?.id}/jobsheets`)}
                className="mt-4 flex items-center justify-between border-t border-blue-100/80 pt-3 text-xs font-bold text-blue-600 transition-colors group-hover:text-blue-800"
              >
                <span>Kelola Jobsheet</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 2: Mahasiswa Aktif */}
            <div className="group flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Mahasiswa Aktif
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
                    <Users size={20} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">{totalStudentsCount} Orang</p>
                <p className="mt-1 text-xs text-gray-500">Terdaftar di seluruh kelas mata kuliah ini</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/mata-kuliah")}
                className="mt-4 flex items-center justify-between border-t border-emerald-100/80 pt-3 text-xs font-bold text-emerald-600 transition-colors group-hover:text-emerald-800"
              >
                <span>Lihat Mata Kuliah</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 3: Menunggu Evaluasi */}
            <div className="group flex flex-col justify-between rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Menunggu Evaluasi
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-transform group-hover:scale-110">
                    <FileCheck size={20} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">{totalPendingReviews} Jobsheet</p>
                <p className="mt-1 text-xs text-gray-500">Submission mahasiswa butuh penilaian</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pendingReviewSubmissions.length > 0 && selectedCourse) {
                    const first = pendingReviewSubmissions[0]
                    const params = new URLSearchParams({
                      courseId: selectedCourse.id,
                      classId: first.classId,
                      jobsheetId: first.jobsheet.id,
                    })
                    navigate(`/reviews/${first.student.id}?${params.toString()}`)
                  } else {
                    navigate("/mata-kuliah")
                  }
                }}
                className="mt-4 flex items-center justify-between border-t border-amber-100/80 pt-3 text-xs font-bold text-amber-600 transition-colors group-hover:text-amber-800"
              >
                <span>Mulai Review</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 4: Deadline Terdekat */}
            <div className="group flex flex-col justify-between rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                    Deadline Terdekat
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 transition-transform group-hover:scale-110">
                    <Clock size={20} />
                  </div>
                </div>
                <p className="mt-3 text-base font-bold text-gray-900 truncate">
                  {upcomingDeadlineJob
                    ? `Jobsheet ${upcomingDeadlineJob.sequence || upcomingDeadlineJob.urutan || 1}`
                    : "Tidak Ada Deadline"}
                </p>
                <p className="mt-1 text-xs font-medium text-purple-700 truncate">
                  {upcomingDeadlineJob ? formatDeadlineLocal(upcomingDeadlineJob.deadline) : "Semua jobsheet aman"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/mata-kuliah/${selectedCourse?.id}/jobsheets`)}
                className="mt-4 flex items-center justify-between border-t border-purple-100/80 pt-3 text-xs font-bold text-purple-600 transition-colors group-hover:text-purple-800"
              >
                <span>Atur Jadwal</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </section>

          {/* Table Utama: Progres Pembelajaran Kelas */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-1 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Progres Pembelajaran Kelas</h2>
              <p className="text-xs text-gray-500">
                Tabel pencapaian jobsheet terbit (aktif/selesai) per kelas dibandingkan total rencana jobsheet 1 semester pada mata kuliah <strong className="text-gray-800">{selectedCourse?.name}</strong>.
              </p>
            </div>

            {classLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">Memuat data progres kelas...</p>
            ) : !classList.length ? (
              <LecturerEmptyState title="Belum ada kelas praktikum untuk mata kuliah ini." />
            ) : (
              <LecturerTable headers={["No.", "Nama Kelas Praktikum", "Progres Pembelajaran Kelas", "Aksi Evaluasi"]}>
                {classList.map((item, index) => {
                  const percentage = Math.min(
                    100,
                    Math.round((item.publishedJobsheetCount / item.totalJobsheets) * 100),
                  )

                  return (
                    <tr key={item.classId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3.5 text-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm font-bold text-gray-900">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-blue-800 border border-blue-200">
                          <Layers size={14} /> Kelas {item.className}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-sm font-bold text-blue-700">
                            {item.publishedJobsheetCount}/{item.totalJobsheets} Jobsheet ({percentage}%)
                          </span>
                          <div className="h-2 w-36 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <LecturerButton
                          variant="secondary"
                          onClick={() => setSelectedClassModal(item)}
                        >
                          Detail
                        </LecturerButton>
                      </td>
                    </tr>
                  )
                })}
              </LecturerTable>
            )}
          </div>
        </>
      )}

      {/* Modal Detail Progres Kelas & Daftar Mahasiswa */}
      {selectedClassModal && (
        <LecturerModal
          title={`Detail Progres Pembelajaran — Kelas ${selectedClassModal.className}`}
          onClose={() => setSelectedClassModal(null)}
          footer={
            <LecturerButton onClick={() => setSelectedClassModal(null)}>Tutup Modal</LecturerButton>
          }
          size="lg"
        >
          <div className="space-y-6">
            {/* Kartu Informasi Kelas */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-4 text-sm text-gray-700 shadow-sm">
              <h3 className="mb-3 text-base font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-600" /> Informasi Detail Kelas
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <span className="block text-xs font-semibold text-gray-400 uppercase">Mata Kuliah</span>
                  <span className="font-bold text-gray-900">{selectedCourse?.name ?? "-"}</span>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <span className="block text-xs font-semibold text-gray-400 uppercase">Nama Kelas / Rombel</span>
                  <span className="font-bold text-gray-900">Kelas {selectedClassModal.className}</span>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <span className="block text-xs font-semibold text-gray-400 uppercase">Jumlah Mahasiswa Aktif</span>
                  <span className="font-bold text-gray-900">{selectedClassModal.students.length} Orang</span>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <span className="block text-xs font-semibold text-gray-400 uppercase">Pencapaian Perkuliahan Kelas</span>
                  <span className="font-bold text-blue-700">
                    {selectedClassModal.publishedJobsheetCount}/{selectedClassModal.totalJobsheets} Jobsheet Terbit
                  </span>
                </div>
              </div>
            </div>

            {/* Tabel Daftar Mahasiswa */}
            <div>
              <div className="mb-3 border-b border-gray-100 pb-2">
                <h3 className="text-base font-bold text-gray-900">Daftar Mahasiswa & Progres Individual</h3>
                <p className="text-xs text-gray-500">
                  Progres mahasiswa dihitung dari total jobsheet yang telah dikumpulkan/disubmit dibandingkan total rencana jobsheet 1 semester ({selectedClassModal.totalJobsheets} Jobsheet).
                </p>
              </div>

              {!selectedClassModal.students.length ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Belum ada mahasiswa terdaftar di kelas ini.
                </p>
              ) : (
                <LecturerTable headers={["No.", "Nama & NIM Mahasiswa", "Jobsheet Diselesaikan", "Aksi Evaluasi"]}>
                  {selectedClassModal.students.map((student, idx) => {
                    const studentSubmissions = selectedClassModal.submissionMatrix.filter(
                      (m) => m.student.id === student.id && isSubmittedSubmission(m.submission),
                    )
                    const completedCount = studentSubmissions.length
                    const studentPct = Math.min(
                      100,
                      Math.round((completedCount / selectedClassModal.totalJobsheets) * 100),
                    )

                    return (
                      <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {student.fullname[0]?.toUpperCase()}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-900">{student.fullname}</span>
                              {student.nim && (
                                <span className="ml-2 text-xs font-mono text-gray-500">({student.nim})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-bold text-blue-700">
                              {completedCount}/{selectedClassModal.totalJobsheets} Jobsheet ({studentPct}%)
                            </span>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${studentPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <LecturerButton
                            variant="ghost"
                            disabled={studentSubmissions.length === 0}
                            title={studentSubmissions.length === 0 ? "Mahasiswa belum mengumpulkan jobsheet" : undefined}
                            onClick={() => {
                              const latestSubmitted = studentSubmissions[studentSubmissions.length - 1]
                              const params = new URLSearchParams({
                                courseId: selectedCourse?.id || "",
                                classId: selectedClassModal.classId,
                              })
                              if (latestSubmitted) params.set("jobsheetId", latestSubmitted.jobsheet.id)
                              navigate(`/reviews/${student.id}?${params.toString()}`)
                            }}
                          >
                            Detail Evaluasi
                          </LecturerButton>
                        </td>
                      </tr>
                    )
                  })}
                </LecturerTable>
              )}
            </div>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
