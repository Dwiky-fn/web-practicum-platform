import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerPanel,
  NativeSelect,
  PageHeader,
  ProgressBar,
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
  const [jobsheetId, setJobsheetId] = useState("all")
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
      setJobsheetId("all")
    }
  }, [classId, selectedCourse, selectedScope])

  useEffect(() => {
    const exists = jobsheets.some((item) => item.id === jobsheetId)
    if (jobsheetId !== "all" && !exists) {
      setJobsheetId("all")
    }
  }, [jobsheetId, jobsheets])

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

  const displayedJobsheets = useMemo(() => {
    if (jobsheetId === "all") return jobsheets
    return jobsheets.filter((item) => item.id === jobsheetId)
  }, [jobsheetId, jobsheets])

  const displayedMatrix = useMemo(() => {
    if (jobsheetId === "all") return matrix
    return matrix.filter((item) => item.jobsheet.id === jobsheetId)
  }, [jobsheetId, matrix])

  const submittedCount = displayedJobsheets.reduce((total, item) => total + item.submitted, 0)
  const targetCount = displayedJobsheets.reduce((total, item) => total + item.total, 0)
  const pendingReviewCount = displayedMatrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Terkumpul",
  ).length
  const revisionCount = displayedMatrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Revisi",
  ).length
  const acceptedCount = displayedMatrix.filter(
    (item) => getSubmissionReviewStatus(item.submission) === "Dinilai",
  ).length
  const progress = targetCount ? Math.round((submittedCount / targetCount) * 100) : 0
  const validationProgress = submittedCount ? Math.round((acceptedCount / submittedCount) * 100) : 0

  const latestTasks = useMemo(
    () =>
      displayedMatrix
        .filter((item) => isSubmittedSubmission(item.submission))
        .sort((left, right) => {
          const leftTime = new Date(left.submission?.updatedAt ?? 0).getTime()
          const rightTime = new Date(right.submission?.updatedAt ?? 0).getTime()
          return rightTime - leftTime
        })
        .slice(0, 5),
    [displayedMatrix],
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
                  setJobsheetId("all")
                }}
                className="w-full"
              >
                {courseGroups.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect label="Kelas Praktikum" value={classId} onChange={(value) => {
                setClassId(value)
                setJobsheetId("all")
              }} className="w-full">
                {(selectedCourse?.classes ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect label="Jobsheet" value={jobsheetId} onChange={setJobsheetId} className="w-full">
                <option value="all">Semua Jobsheet</option>
                {jobsheets.map((item) => (
                  <option key={item.id} value={item.id}>Jobsheet {item.number}</option>
                ))}
              </NativeSelect>
            </div>
          </LecturerPanel>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Mahasiswa" value={studentCount || selectedClass?.studentCount || 0} />
            <StatCard label="Submit" value={`${submittedCount}/${targetCount || studentCount || 0}`} />
            <StatCard label="Menunggu Review" value={pendingReviewCount} />
            <StatCard label="Revisi" value={revisionCount} />
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
                Progress Kelas Praktikum
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Submission Masuk</p>
                  <ProgressBar value={progress} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Review Dosen</p>
                  <ProgressBar value={validationProgress} />
                </div>
                {selectedClass && (
                  <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">{selectedClass.name}</p>
                    <p>ID kelas praktikum: {selectedScope.kelasPraktikumId ?? "-"}</p>
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
                <li>{displayedMatrix.filter((item) => !item.submission || item.submission.status === "DRAFT").length} laporan belum mulai</li>
              </ul>
            </LecturerPanel>

            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Jobsheet Kelas Praktikum</h2>
              <div className="space-y-3 text-sm">
                {displayedJobsheets.filter((item) => item.status === "Published").length ? (
                  displayedJobsheets
                    .filter((item) => item.status === "Published")
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
    </LecturerLayout>
  )
}
