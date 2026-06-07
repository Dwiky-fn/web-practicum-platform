import { useEffect, useMemo, useState } from "react"
import StudentProfileModal from "../components/StudentProfileModal"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
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
  buildLecturerJobsheetSummaries,
  getLecturerClassDetail,
  getLecturerCourseGroups,
  getLecturerSubmissionMatrix,
  getSubmissionWorkStatus,
  type LecturerCourseGroup,
  type LecturerJobsheetSummary,
  type LecturerSubmissionMatrixItem,
} from "../service"

export default function LecturerMonitoringPage() {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [courseGroups, setCourseGroups] = useState<LecturerCourseGroup[]>([])
  const [courseId, setCourseId] = useState("")
  const [classId, setClassId] = useState("")
  const [jobsheetId, setJobsheetId] = useState("all")
  const [status, setStatus] = useState("all")
  const [keyword, setKeyword] = useState("")
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [jobsheets, setJobsheets] = useState<LecturerJobsheetSummary[]>([])
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])

  const selectedCourse = courseGroups.find((item) => item.id === courseId) ?? null

  useEffect(() => {
    async function loadCourses() {
      if (!user || user.role !== "DOSEN") return

      setLoading(true)
      setError("")

      try {
        const groups = await getLecturerCourseGroups(user.id)
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
      setJobsheetId("all")
    }
  }, [classId, selectedCourse])

  useEffect(() => {
    const exists = jobsheets.some((item) => item.id === jobsheetId)
    if (jobsheetId !== "all" && !exists) {
      setJobsheetId("all")
    }
  }, [jobsheetId, jobsheets])

  useEffect(() => {
    async function loadClassData() {
      if (!classId) return

      setLoading(true)
      setError("")
      setJobsheets([])
      setMatrix([])
      setStudentCount(0)

      try {
        const classDetail = await getLecturerClassDetail(classId)
        const submissionMatrix = await getLecturerSubmissionMatrix(
          classDetail.courseId,
          classDetail.jobsheets,
          classDetail.students,
        )
        const summaries = buildLecturerJobsheetSummaries(
          classDetail.jobsheets,
          classDetail.students,
          submissionMatrix,
          classDetail.name,
        ).map((item) => ({ ...item, courseId: classDetail.courseId }))

        setStudentCount(classDetail.students.length)
        setJobsheets(summaries)
        setMatrix(submissionMatrix)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data monitoring kelas.")
      } finally {
        setLoading(false)
      }
    }

    loadClassData()
  }, [classId])

  const visibleRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return matrix.filter((item) => {
      const matchKeyword =
        !normalized ||
        [item.student.nim, item.student.fullname].some((value) => value.toLowerCase().includes(normalized))
      const matchJobsheet = jobsheetId === "all" || item.jobsheet.id === jobsheetId
      const workStatus = getSubmissionWorkStatus(item.submission)
      const matchStatus = status === "all" || workStatus === status

      return matchKeyword && matchJobsheet && matchStatus
    })
  }, [jobsheetId, keyword, matrix, status])

  const doneCount = visibleRows.filter((item) => getSubmissionWorkStatus(item.submission) === "Selesai").length
  const workingCount = visibleRows.filter((item) => getSubmissionWorkStatus(item.submission) === "Sedang").length
  const notStartedCount = visibleRows.filter((item) => getSubmissionWorkStatus(item.submission) === "Belum").length
  const latestActivities = visibleRows
    .filter((item) => item.submission)
    .sort((left, right) => {
      const leftTime = new Date(left.submission?.updatedAt ?? 0).getTime()
      const rightTime = new Date(right.submission?.updatedAt ?? 0).getTime()
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
                  setJobsheetId("all")
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
                setJobsheetId("all")
              }} label="Kelas" className="w-full">
                {(selectedCourse?.classes ?? []).map((item) => (
                  <option key={item.id} value={item.id}>Kelas {item.name}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={jobsheetId} onChange={setJobsheetId} label="Jobsheet" className="w-full">
                <option value="all">Semua Jobsheet</option>
                {jobsheets.map((jobsheet) => (
                  <option key={jobsheet.id} value={jobsheet.id}>Jobsheet {jobsheet.number}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={status} onChange={setStatus} label="Status" className="w-full">
                <option value="all">Semua Status</option>
                <option value="Belum">Belum Mulai</option>
                <option value="Sedang">Sedang Mengerjakan</option>
                <option value="Selesai">Selesai</option>
              </NativeSelect>
            </div>
          </LecturerPanel>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Mahasiswa" value={studentCount} />
            <StatCard label="Belum Mulai" value={notStartedCount} />
            <StatCard label="Sedang Mengerjakan" value={workingCount} />
            <StatCard label="Selesai" value={doneCount} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Insight Praktikum</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>{notStartedCount} submission belum dimulai</li>
                <li>{workingCount} submission sedang dikerjakan atau menunggu tindak lanjut</li>
                <li>{visibleRows.filter((item) => item.submission?.status === "REVISION").length} submission ada di status revisi</li>
              </ul>
            </LecturerPanel>

            <LecturerPanel className="p-5">
              <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Aktivitas Terbaru</h2>
              {!latestActivities.length ? (
                <p className="text-sm text-gray-500">Belum ada aktivitas submission untuk filter ini.</p>
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
          </section>

          <LecturerPanel className="mt-6 p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">Daftar Mahasiswa</h2>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" className="w-full md:w-auto" />
            </div>

            {!visibleRows.length ? (
              <LecturerEmptyState title="Tidak ada data mahasiswa untuk filter monitoring ini." />
            ) : (
              <LecturerTable headers={["NIM", "Nama", "Status", "Aktifitas", "Terakhir Aktif"]}>
                {visibleRows.map((item) => (
                  <tr key={`${item.student.id}-${item.jobsheet.id}`}>
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
                    <td className="px-4 py-3 text-center">{getSubmissionWorkStatus(item.submission)}</td>
                    <td className="px-4 py-3 text-center">Jobsheet {jobsheets.find((jobsheet) => jobsheet.id === item.jobsheet.id)?.number ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.submission?.updatedAt ? new Date(item.submission.updatedAt).toLocaleString("id-ID") : "-"}
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
