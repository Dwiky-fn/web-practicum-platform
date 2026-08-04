import { useEffect, useState } from "react"
import { BookOpen, ChevronDown, ChevronUp, Layers, Sparkles, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerEmptyState } from "../components/LecturerUI"
import Breadcrumbs from "../../../components/Breadcrumbs"
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
  const [openIds, setOpenIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("lecturer_courses_open_ids")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat mata kuliah dosen.")
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [user])

  const toggleCourse = (courseId: string) => {
    setOpenIds((current) => {
      const next = current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
      try {
        sessionStorage.setItem("lecturer_courses_open_ids", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const historyPeriods = Array.from(new Set(historyCourses.map((course) => course.period).filter(Boolean)))
  const filteredHistoryCourses = historyPeriod === "all"
    ? historyCourses
    : historyCourses.filter((course) => course.period === historyPeriod)
  const courses = activeTab === "active" ? activeCourses : filteredHistoryCourses
  const emptyTitle = activeTab === "active"
    ? "Belum ada mata kuliah yang diampu pada semester aktif."
    : "Belum ada riwayat pengajaran."

  return (
    <LecturerLayout backTo="/dashboard">
      {loading ? (
        <div className="space-y-6">
          <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-20 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>


      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Hero Banner Panel */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Sparkles size={16} className="text-yellow-400" />
              Penugasan Pengajaran Dosen
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">
              {activeTab === "active" ? "Pengajaran Semester Berjalan" : "Riwayat Arsip Pengajaran"}
            </h2>
            <p className="text-xs text-blue-200">
              Total {courses.length} mata kuliah terdaftar pada {activeTab === "active" ? "semester aktif saat ini" : "arsip riwayat"}.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "active"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              Pengajaran Aktif ({activeCourses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "history"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              Riwayat ({historyCourses.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "history" && historyPeriods.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:max-w-xs">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600" htmlFor="history-period-filter">
            Filter Tahun Semester
          </label>
          <select
            id="history-period-filter"
            value={historyPeriod}
            onChange={(event) => setHistoryPeriod(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/30 px-6 py-5 text-left transition-colors hover:bg-blue-50/90"
                  onClick={() => toggleCourse(course.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Semester {course.semester} &bull; Periode: {course.period} &bull; Total {course.classes.length} Kelas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="hidden text-xs font-semibold sm:inline-block">
                      {open ? "Sembunyikan Kelas" : "Tampilkan Kelas"}
                    </span>
                    {open ? <ChevronUp size={20} className="text-blue-700" /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-gray-100 p-6 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        <Layers size={16} className="text-blue-600" />
                        {activeTab === "active" ? "Daftar Kelas Praktikum Aktif" : "Riwayat Kelas Praktikum"}
                      </h4>
                      {activeTab === "active" && (
                        <LecturerButton
                          variant="secondary"
                          onClick={() => navigate(`${academicCourseBasePath(course.id, { mataKuliahId: course.mataKuliahId || course.id })}/jobsheets`)}
                        >
                          Kelola Jobsheet Mata Kuliah
                        </LecturerButton>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {course.classes.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-flex items-center gap-1 text-base font-bold text-gray-900">
                                Kelas {item.name}
                              </span>
                              <p className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Users size={14} className="text-emerald-600" /> {item.studentCount} Mahasiswa
                                </span>
                                &bull;
                                <span>{item.jobsheetCount} Jobsheet</span>
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200/60">
                            <LecturerButton
                              variant={activeTab === "history" ? "secondary" : "primary"}
                              onClick={() => navigate(`/kelas-praktikum/${course.id}/${item.id}${activeTab === "history" ? "?scope=history" : ""}`)}
                            >
                              {activeTab === "history" ? "Lihat Riwayat Kelas" : "Masuk Kelas Praktikum"}
                            </LecturerButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
        </>
      )}
    </LecturerLayout>
  )
}
