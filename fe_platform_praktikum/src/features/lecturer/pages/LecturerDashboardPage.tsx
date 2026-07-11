import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerModal,
  LecturerPanel,
  NativeSelect,
  PageHeader,
  StatCard,
} from "../components/LecturerUI"
import {
  buildLecturerJobsheetSummaries,
  getLecturerClassDetail,
  getLecturerCourseGroups,
  getLecturerSubmissionMatrix,
  getSubmissionReviewStatus,
  isSubmittedSubmission,
  type LecturerCourseGroup,
  type LecturerJobsheetSummary,
  type LecturerSubmissionMatrixItem,
} from "../service"
import { formatDeadlineLocal } from "../utils/deadline"

export default function LecturerDashboardPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [courseGroups, setCourseGroups] = useState<LecturerCourseGroup[]>([])
  const [courseId, setCourseId] = useState("")
  const [classId, setClassId] = useState("")
  const [showProgressDetail, setShowProgressDetail] = useState(false)
  const [jobsheets, setJobsheets] = useState<LecturerJobsheetSummary[]>([])
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])
  const [studentCount, setStudentCount] = useState(0)

  const selectedCourse = courseGroups.find((item) => item.id === courseId) ?? null
  const selectedClass = selectedCourse?.classes.find((item) => item.id === classId) ?? null
  const selectedScope = useMemo(
    () => ({
      mataKuliahId: selectedCourse?.mataKuliahId || selectedCourse?.id,
      kelasPraktikumId: selectedClass?.kelasPraktikumId || selectedClass?.id_kelas_praktikum,
    }),
    [
      selectedClass?.id_kelas_praktikum,
      selectedClass?.kelasPraktikumId,
      selectedCourse?.id,
      selectedCourse?.mataKuliahId,
    ],
  )
  const selectedClassDetailPath =
    selectedCourse && selectedClass
      ? `/kelas-praktikum/${selectedCourse.id}/${selectedClass.id}?tab=evaluation${
          selectedScope.mataKuliahId ? `&mataKuliahId=${selectedScope.mataKuliahId}` : ""
        }${selectedScope.kelasPraktikumId ? `&kelasPraktikumId=${selectedScope.kelasPraktikumId}` : ""}`
      : ""

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
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat dashboard dosen.")
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
  }, [classId, selectedCourse, selectedScope])

  useEffect(() => {
    async function loadClassData() {
      if (!selectedCourse || !classId) return

      setLoading(true)
      setError("")
      setJobsheets([])
      setMatrix([])
      setStudentCount(0)

      try {
        const classDetail = await getLecturerClassDetail(classId)
        const mataKuliahId = classDetail.mataKuliahId || classDetail.id_mata_kuliah || selectedScope.mataKuliahId
        const kelasPraktikumId = classDetail.kelasPraktikumId || classDetail.id_kelas_praktikum || selectedScope.kelasPraktikumId
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

        setStudentCount(classDetail.students.length)
        setMatrix(submissionMatrix)
        setJobsheets(summaries)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data kelas.")
      } finally {
        setLoading(false)
      }
    }

    loadClassData()
  }, [classId, selectedCourse, selectedScope.kelasPraktikumId, selectedScope.mataKuliahId])

  const publishedJobsheets = useMemo(
    () => jobsheets.filter((item) => item.status === "Published").sort((left, right) => left.number - right.number),
    [jobsheets],
  )
  const currentJobsheet = useMemo(() => {
    const unfinished = publishedJobsheets.find((item) => item.total > 0 && item.submitted < item.total)
    return unfinished ?? publishedJobsheets[publishedJobsheets.length - 1] ?? null
  }, [publishedJobsheets])
  const currentJobsheetMatrix = useMemo(
    () => currentJobsheet ? matrix.filter((item) => item.jobsheet.id === currentJobsheet.id) : [],
    [currentJobsheet, matrix],
  )
  const currentSubmittedCount = currentJobsheetMatrix.filter((item) => isSubmittedSubmission(item.submission)).length
  const pendingReviewCount = matrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Terkumpul",
  ).length
  const revisionCount = matrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Revisi",
  ).length
  const upcomingDeadline = publishedJobsheets
    .filter((item) => item.deadline && item.deadline !== "-" && new Date(item.deadline).getTime() >= Date.now())
    .sort((left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime())[0] ?? null

  const latestTasks = useMemo(
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

  if (loading && !courseGroups.length) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <PageHeader
        title="Dashboard Dosen"
        subtitle="Pantau progres praktikum, validasi laporan, dan aktivitas kelas."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!courseGroups.length ? (
        <LecturerEmptyState title="Belum ada kelas yang diampu pada semester aktif." />
      ) : (
        <>
          <LecturerPanel className="mb-6 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <NativeSelect
                label="Mata kuliah"
                value={courseId}
                onChange={(value) => {
                  const nextCourse = courseGroups.find((item) => item.id === value)
                  setCourseId(value)
                  setClassId(nextCourse?.classes[0]?.id || "")
                }}
                className="w-full"
              >
                {courseGroups.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect label="Kelas Praktikum" value={classId} onChange={(value) => {
                setClassId(value)
              }} className="w-full">
                {(selectedCourse?.classes ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>
            </div>
          </LecturerPanel>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <LecturerPanel className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Progres Pembelajaran</h2>
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p>Total Jobsheet: <span className="font-semibold">{publishedJobsheets.length}</span></p>
                    <p>
                      Progres Saat Ini:{" "}
                      <span className="font-semibold">
                        {currentJobsheet ? `Jobsheet ${currentJobsheet.number} dari ${publishedJobsheets.length}` : "Belum ada jobsheet publish"}
                      </span>
                    </p>
                    <p>
                      Mahasiswa Sudah Submit:{" "}
                      <span className="font-semibold">{currentSubmittedCount} dari {studentCount || selectedClass?.studentCount || 0}</span>
                    </p>
                  </div>
                </div>
                <LecturerButton variant="secondary" onClick={() => setShowProgressDetail(true)}>
                  Detail
                </LecturerButton>
              </div>
            </LecturerPanel>
            <StatCard label="Menunggu Review" value={`${pendingReviewCount} Submission`} />
            <LecturerPanel className="p-5">
              <h2 className="text-base font-semibold text-gray-900">Deadline Mendatang</h2>
              {upcomingDeadline ? (
                <div className="mt-4 space-y-1 text-sm text-gray-700">
                  <p className="font-semibold">Jobsheet {upcomingDeadline.number}: {upcomingDeadline.title}</p>
                  <p>{formatDeadlineLocal(upcomingDeadline.deadline)}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">Tidak ada deadline mendatang.</p>
              )}
            </LecturerPanel>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <LecturerPanel className="p-5">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-lg font-semibold text-gray-900">Submission Terbaru Kelas Praktikum</h2>
                {selectedCourse && selectedClass && (
                  <LecturerButton
                    variant="ghost"
                    onClick={() => navigate(selectedClassDetailPath)}
                  >
                    Lihat Semua
                  </LecturerButton>
                )}
              </div>

              {!latestTasks.length ? (
                <p className="text-sm text-gray-500">Belum ada submission untuk filter yang dipilih.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="text-left text-gray-600">
                      <tr>
                        <th className="py-2">Mahasiswa</th>
                        <th className="py-2">Jobsheet</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {latestTasks.map((item) => {
                        const jobsheet = jobsheets.find((current) => current.id === item.jobsheet.id)

                        return (
                          <tr key={`${item.student.id}-${item.jobsheet.id}`}>
                            <td className="py-3">{item.student.fullname}</td>
                            <td className="py-3">{jobsheet?.title ?? `Jobsheet ${jobsheet?.number ?? "-"}`}</td>
                            <td className="py-3">{getSubmissionReviewStatus(item.submission)}</td>
                            <td className="py-3">
                              {selectedCourse && selectedClass && (
                                <button
                                  type="button"
                                  className="font-semibold text-blue-700 hover:text-blue-900"
                                  onClick={() =>
                                    {
                                      const params = new URLSearchParams({
                                        courseId: selectedCourse.id,
                                        classId: selectedClass.id,
                                        jobsheetId: item.jobsheet.id,
                                      })
                                      if (selectedScope.mataKuliahId) params.set("mataKuliahId", selectedScope.mataKuliahId)
                                      if (selectedScope.kelasPraktikumId) params.set("kelasPraktikumId", selectedScope.kelasPraktikumId)
                                      navigate(`/reviews/${item.student.id}?${params.toString()}`)
                                    }
                                  }
                                >
                                  Review
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </LecturerPanel>

            <LecturerPanel className="p-5">
                  <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold text-gray-900">
                Informasi Kelas Praktikum
              </h2>
              <div className="space-y-3">
                {selectedClass && (
                  <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">{selectedClass.name}</p>
                    <p>ID kelas praktikum: {selectedScope.kelasPraktikumId ?? "-"}</p>
                    <p>Total mahasiswa: {studentCount || selectedClass.studentCount || 0}</p>
                    <p>Total jobsheet publish: {publishedJobsheets.length}</p>
                    <p>Submission revisi: {revisionCount}</p>
                  </div>
                )}
              </div>
            </LecturerPanel>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Perlu Tindakan</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>{pendingReviewCount} laporan menunggu review dosen</li>
                <li>{revisionCount} laporan sedang dalam status revisi</li>
                <li>{matrix.filter((item) => !item.submission || item.submission.status === "DRAFT").length} laporan belum mulai</li>
              </ul>
            </LecturerPanel>

            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Jobsheet Kelas Praktikum</h2>
              <div className="space-y-3 text-sm">
                {publishedJobsheets.length ? (
                  publishedJobsheets
                    .map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                        <span className="truncate">{item.title || `Jobsheet ${item.number}`}</span>
                        <span>{formatDeadlineLocal(item.deadline)}</span>
                        <span>{item.submitted}/{item.total}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">Belum ada jobsheet aktif pada kelas ini.</p>
                )}
              </div>
            </LecturerPanel>
          </section>
        </>
      )}
      {showProgressDetail && (
        <LecturerModal
          title="Detail Progres Pembelajaran"
          onClose={() => setShowProgressDetail(false)}
          footer={<LecturerButton onClick={() => setShowProgressDetail(false)}>Tutup</LecturerButton>}
        >
          <div className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p>Mata Kuliah: <span className="font-semibold">{selectedCourse?.name ?? "-"}</span></p>
              <p>Kelas: <span className="font-semibold">{selectedClass?.name ?? "-"}</span></p>
              <p>Tahun Semester: <span className="font-semibold">{selectedCourse?.period ?? "-"}</span></p>
              <p>Total Mahasiswa: <span className="font-semibold">{studentCount || selectedClass?.studentCount || 0}</span></p>
              <p>Total Jobsheet: <span className="font-semibold">{publishedJobsheets.length}</span></p>
              <p>Jobsheet Berjalan: <span className="font-semibold">{currentJobsheet ? `Jobsheet ${currentJobsheet.number} - ${currentJobsheet.title}` : "-"}</span></p>
              <p>Mahasiswa Sudah Submit: <span className="font-semibold">{currentSubmittedCount} dari {studentCount || selectedClass?.studentCount || 0}</span></p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Informasi Mahasiswa</h3>
              <div className="max-h-52 overflow-auto rounded-md border border-gray-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">NIM</th>
                      <th className="px-3 py-2">Nama Mahasiswa</th>
                      <th className="px-3 py-2">Progres Keseluruhan</th>
                      <th className="px-3 py-2">Jobsheet Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedClass ? matrix : []).reduce<Array<{ id: string; nim: string; fullname: string; submitted: number; latest: string }>>((rows, item) => {
                      const current = rows.find((row) => row.id === item.student.id)
                      const submitted = isSubmittedSubmission(item.submission) ? 1 : 0
                      const jobsheetName = item.submission ? (jobsheets.find((jobsheet) => jobsheet.id === item.jobsheet.id)?.title ?? item.jobsheet.title) : ""
                      if (current) {
                        current.submitted += submitted
                        if (jobsheetName) current.latest = jobsheetName
                        return rows
                      }
                      rows.push({
                        id: item.student.id,
                        nim: item.student.nim,
                        fullname: item.student.fullname,
                        submitted,
                        latest: jobsheetName || "Belum Memulai",
                      })
                      return rows
                    }, []).map((student) => (
                      <tr key={student.id}>
                        <td className="px-3 py-2 font-mono">{student.nim}</td>
                        <td className="px-3 py-2">{student.fullname}</td>
                        <td className="px-3 py-2">{student.submitted} dari {publishedJobsheets.length} jobsheet</td>
                        <td className="px-3 py-2">{student.latest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Tabel Progres Jobsheet</h3>
              <div className="overflow-auto rounded-md border border-gray-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Nama Jobsheet</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {publishedJobsheets.map((jobsheet) => {
                      const related = matrix.filter((item) => item.jobsheet.id === jobsheet.id)
                      const waitingReview = related.filter((item) => getSubmissionReviewStatus(item.submission) === "Terkumpul")
                      const statusLabel = waitingReview.length
                        ? "Menunggu Review"
                        : related.some((item) => getSubmissionReviewStatus(item.submission) === "Dinilai")
                          ? "Sudah Direview"
                          : related.some((item) => isSubmittedSubmission(item.submission))
                            ? "Sudah Dikumpulkan"
                            : related.some((item) => item.submission)
                              ? "Sedang Dikerjakan"
                              : "Belum Dimulai"

                      return (
                        <tr key={jobsheet.id}>
                          <td className="px-3 py-2">{jobsheet.title}</td>
                          <td className="px-3 py-2">{statusLabel}</td>
                          <td className="px-3 py-2">
                            <LecturerButton
                              variant="ghost"
                              disabled={!waitingReview.length || !selectedCourse || !selectedClass}
                              onClick={() => {
                                const target = waitingReview[0]
                                if (!target || !selectedCourse || !selectedClass) return
                                const params = new URLSearchParams({
                                  courseId: selectedCourse.id,
                                  classId: selectedClass.id,
                                  jobsheetId: jobsheet.id,
                                  from: "dashboard-progress",
                                })
                                if (selectedScope.mataKuliahId) params.set("mataKuliahId", selectedScope.mataKuliahId)
                                if (selectedScope.kelasPraktikumId) params.set("kelasPraktikumId", selectedScope.kelasPraktikumId)
                                navigate(`/reviews/${target.student.id}?${params.toString()}`)
                              }}
                            >
                              Review
                            </LecturerButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
