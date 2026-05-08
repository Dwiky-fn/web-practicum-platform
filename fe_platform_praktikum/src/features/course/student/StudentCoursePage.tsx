import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { getCoursesByStudentId } from "../../../services/course/service";
import { useNavigate } from "react-router-dom";
import type { Course } from "../../../services/course/types";
import Navbar from "../../../components/navbar/Navbar";
import CourseCardSkeleton from "../../../components/loading/CourseSkeleton";
import CourseCard from "../../../components/CourseCard";
import TopProgressBar from "../../../components/loading/TopProgressBar";

export default function StudentCoursePage() {
  const { user } = useCurrentUser();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const courses = await getCoursesByStudentId(user.id)
        setCourses(courses)
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleSearch = () => {
    console.log("Cari:", keyword);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-10 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Left */}
          <div>
            <h1 className="text-2xl font-semibold">
              Mata Kuliah Saya
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {courses.length} Mata Kuliah Terdaftar
            </p>
          </div>

          {/* Right - Search */}
          <div className="relative w-full md:w-80">
            <input
              type="search"
              value={keyword}
              placeholder="Cari mata kuliah..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />

            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 active:text-blue-600 transition"
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i}/>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-gray-500">
            Belum ada mata kuliah.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => navigate(`/courses/${course.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
