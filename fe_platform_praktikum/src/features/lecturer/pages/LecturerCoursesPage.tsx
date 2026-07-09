import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerEmptyState, LecturerPanel, PageHeader } from "../components/LecturerUI"
import { getLecturerCourseGroups, type LecturerCourseGroup } from "../service"
import { academicCourseBasePath } from "../../../services/academicScope"

export default function LecturerCoursesPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeCourses, setActiveCourses] = useState<LecturerCourseGroup[]>([])
  const [historyCourses, setHistoryCourses] = useState<LecturerCourseGroup[]>([])
  const [activeTab, setActiveTab] = useState<"active" | "history">("active")
  const [openIds, setOpenIds] = useState<string[]>([])
  const [historyPeriod, setHistoryPeriod] = useState("all")

  useEffect(() => {
    async function loadCourses() {
      if (!user || user.role !== "DOSEN") return

      setLoading(true)
      setError("")

      try {
        const activeGroups = await getLecturerCourseGroups({ scope: "active" })
        let historyGroups: LecturerCourseGroup[] = []
        try {
          historyGroups = await getLecturerCourseGroups({ scope: "history" })
        } catch {
          historyGroups = []
        }
        setActiveCourses(activeGroups)
        setHistoryCourses(historyGroups)
        setOpenIds(activeGroups[0] ? [activeGroups[0].id] : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat mata kuliah dosen.")
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [user])

  const toggleCourse = (courseId: string) => {
    setOpenIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    )
  }

  const historyPeriods = Array.from(new Set(historyCourses.map((course) => course.period).filter(Boolean)))
  const filteredHistoryCourses = historyPeriod === "all"
    ? historyCourses
    : historyCourses.filter((course) => course.period === historyPeriod)
  const courses = activeTab === "active" ? activeCourses : filteredHistoryCourses
  const emptyTitle = activeTab === "active"
    ? "Belum ada mata kuliah yang diampu pada semester aktif."
    : "Belum ada riwayat pengajaran."

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <PageHeader
        title="Mata Kuliah yang Diampu"
        subtitle="Pisahkan pengajaran semester berjalan dan riwayat pengajaran sebelumnya."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab("active")
            setOpenIds(activeCourses[0] ? [activeCourses[0].id] : [])
          }}
          className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition ${activeTab === "active" ? "bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"}`}
        >
          Pengajaran Aktif
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("history")
            setOpenIds(historyCourses[0] ? [historyCourses[0].id] : [])
          }}
          className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition ${activeTab === "history" ? "bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"}`}
        >
          Riwayat Pengajaran
        </button>
      </div>

      {activeTab === "history" && (
        <div className="mb-5 flex flex-col gap-2 sm:max-w-xs">
          <label className="text-sm font-semibold text-gray-700" htmlFor="history-period-filter">Tahun Semester</label>
          <select
            id="history-period-filter"
            value={historyPeriod}
            onChange={(event) => setHistoryPeriod(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Semua Tahun Semester</option>
            {historyPeriods.map((period) => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
        </div>
      )}

      {!courses.length ? (
        <LecturerEmptyState title={emptyTitle} />
      ) : (
        <div className="space-y-5">
          {courses.map((course) => {
            const open = openIds.includes(course.id)

            return (
              <LecturerPanel key={course.id} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 bg-blue-50 px-5 py-4 text-left hover:bg-blue-100"
                  onClick={() => toggleCourse(course.id)}
                >
                  <span>
                    <span className="block text-lg font-semibold text-gray-900">{course.name}</span>
                    <span className="text-sm text-gray-600">Semester {course.semester} - {course.period}</span>
                  </span>
                  {open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {open && (
                  <div className="border-t border-gray-200 p-5">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                      {activeTab === "active" ? "Kelas Praktikum yang Diampu" : "Riwayat Kelas Praktikum"}
                    </h2>
                    <div className="space-y-3">
                      {course.classes.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              {item.studentCount} mahasiswa, {item.jobsheetCount} jobsheet
                            </p>
                          </div>
                          <LecturerButton
                            variant={activeTab === "history" ? "secondary" : "primary"}
                            onClick={() => navigate(`/kelas-praktikum/${course.id}/${item.id}${activeTab === "history" ? "?scope=history" : ""}`)}
                          >
                            {activeTab === "history" ? "Lihat Riwayat" : "Masuk Kelas Praktikum"}
                          </LecturerButton>
                        </div>
                      ))}
                    </div>
                    {activeTab === "active" && <div className="mt-5 border-t border-gray-200 pt-4">
                      <LecturerButton
                        variant="secondary"
                        onClick={() => navigate(`${academicCourseBasePath(course.id, { mataKuliahId: course.mataKuliahId || course.id })}/jobsheets`)}
                      >
                        Kelola Jobsheet
                      </LecturerButton>
                    </div>}
                  </div>
                )}
              </LecturerPanel>
            )
          })}
        </div>
      )}
    </LecturerLayout>
  )
}
