import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useNavigate } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerPanel, PageHeader } from "../components/LecturerUI"
import { lecturerCourses } from "../data/dummy"

export default function LecturerCoursesPage() {
  const [openIds, setOpenIds] = useState<string[]>(["pbo"])
  const navigate = useNavigate()

  const toggleCourse = (courseId: string) => {
    setOpenIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    )
  }

  return (
    <LecturerLayout>
      <PageHeader
        title="Mata Kuliah yang Diampu"
        subtitle="Daftar mata kuliah dan kelas yang diampu pada semester aktif."
      />

      <div className="space-y-5">
        {lecturerCourses.map((course) => {
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
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Kelas yang Diampu</h2>
                  <div className="space-y-3">
                    {course.classes.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">Kelas {item.name}</p>
                          <p className="text-sm text-gray-600">{item.studentCount} mahasiswa</p>
                        </div>
                        <LecturerButton onClick={() => navigate(`/classes/${course.id}/${item.id}`)}>
                          Masuk Kelas
                        </LecturerButton>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-gray-200 pt-4">
                    <LecturerButton variant="secondary" onClick={() => navigate(`/courses/${course.id}/jobsheets`)}>
                      Kelola Jobsheet
                    </LecturerButton>
                  </div>
                </div>
              )}
            </LecturerPanel>
          )
        })}
      </div>
    </LecturerLayout>
  )
}
