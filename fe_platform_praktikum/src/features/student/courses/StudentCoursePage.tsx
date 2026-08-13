import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, BookOpen } from "lucide-react";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { getCoursesByStudentId } from "../../../services/course/service";
import { useNavigate } from "react-router-dom";
import type { Course } from "../../../services/course/types";
import { academicCoursePath } from "../../../services/academicScope";
import Navbar from "../../../components/navbar/Navbar";
import Breadcrumbs from "../../../components/Breadcrumbs";
import CourseCardSkeleton from "../../../components/loading/CourseSkeleton";
import CourseCard from "../../../components/CourseCard";
import TopProgressBar from "../../../components/loading/TopProgressBar";
import ScrollToTopButton from "../../../components/ScrollToTopButton";

export default function StudentCoursePage() {
  const { user } = useCurrentUser();

  const [courses, setCourses] = useState<Course[]>([]);
  const [historyCourses, setHistoryCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setError("")
        const [courseData, historyCourseData] = await Promise.all([
          getCoursesByStudentId(user.id, { scope: "active" }),
          getCoursesByStudentId(user.id, { scope: "history" }),
        ])
        setCourses(courseData)
        setHistoryCourses(historyCourseData)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal memuat mata kuliah.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const activeCourseList = activeTab === "active" ? courses : historyCourses;

  const filteredCourses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    if (!normalizedKeyword) return activeCourseList

    return activeCourseList.filter((course) =>
      [
        course.name,
        course.code,
        course.lecturer,
        course.description,
      ].some((value) => value?.toLowerCase().includes(normalizedKeyword))
    )
  }, [activeCourseList, keyword])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        <Breadcrumbs items={[{ label: "Mata Kuliah" }]} />
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Hero Banner Panel */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                <Sparkles size={16} className="text-yellow-400" />
                Mata Kuliah Praktikum Mahasiswa
              </div>
              <h1 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
                Mata Kuliah Saya
              </h1>
              <p className="text-xs text-blue-200 mt-0.5">
                Total {courses.length} mata kuliah terdaftar pada {activeTab === "active" ? "semester aktif saat ini" : "arsip riwayat"}.
              </p>
            </div>

            {/* Search Input inside Banner */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={keyword}
                placeholder="Cari mata kuliah..."
                className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-9 pr-4 text-xs font-medium text-white placeholder-blue-200 backdrop-blur-md focus:border-white focus:outline-none"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "active"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Semester Berjalan ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Riwayat Arsip ({historyCourses.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i}/>
            ))}
          </div>
        ) : activeCourseList.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-sm">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">
              {activeTab === "active" ? "Belum ada mata kuliah yang terdaftar." : "Belum ada riwayat mata kuliah."}
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-sm">
            <Search className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">Mata kuliah tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={`${course.id}-${course.kelasPraktikumId}`}
                course={course}
                onClick={() => navigate(academicCoursePath(course))}
                hideProgress={true}
              />
            ))}
          </div>
        )}
      </main>

      <ScrollToTopButton />
    </div>
  )
}
