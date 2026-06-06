import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerPanel, NativeSelect, PageHeader, ProgressBar, StatCard } from "../components/LecturerUI"
import { getClass, getCourse, lecturerCourses, lecturerJobsheets, studentProgress } from "../data/dummy"

export default function LecturerDashboardPage() {
  const [courseId, setCourseId] = useState("pbo")
  const [classId, setClassId] = useState("pbo-a")
  const navigate = useNavigate()
  const course = getCourse(courseId)
  const selectedClass = getClass(courseId, classId)

  const courseJobsheets = lecturerJobsheets.filter((jobsheet) => jobsheet.courseId === course.id)
  const selectedJobsheets = courseJobsheets.filter((jobsheet) => jobsheet.usedIn.includes(selectedClass.name))
  const submittedCount = selectedJobsheets.reduce((total, jobsheet) => total + jobsheet.submitted, 0)
  const targetCount = selectedJobsheets.reduce((total, jobsheet) => total + jobsheet.total, 0)
  const progress = targetCount ? Math.round((submittedCount / targetCount) * 100) : 0

  const latestTasks = useMemo(
    () => studentProgress.slice(0, 3),
    [],
  )

  return (
    <LecturerLayout>
      <PageHeader
        title="Dashboard Dosen"
        subtitle="Pantau progres praktikum, validasi laporan, dan aktivitas kelas."
      />

      <LecturerPanel className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <NativeSelect
            label="Mata kuliah"
            value={courseId}
            onChange={(value) => {
              const nextCourse = getCourse(value)
              setCourseId(value)
              setClassId(nextCourse.classes[0].id)
            }}
          >
            {lecturerCourses.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
          <NativeSelect label="Kelas" value={classId} onChange={setClassId}>
            {course.classes.map((item) => (
              <option key={item.id} value={item.id}>Kelas {item.name}</option>
            ))}
          </NativeSelect>
          <NativeSelect label="Jobsheet" value="all" onChange={() => undefined}>
            <option value="all">Semua Jobsheet</option>
            {courseJobsheets.map((item) => (
              <option key={item.id} value={item.id}>Jobsheet {item.number}</option>
            ))}
          </NativeSelect>
        </div>
      </LecturerPanel>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Mahasiswa" value={selectedClass.studentCount} />
        <StatCard label="Submit" value={`${submittedCount}/${targetCount || selectedClass.studentCount}`} />
        <StatCard label="Validasi Review" value={studentProgress.filter((item) => item.status === "Terkumpul").length} />
        <StatCard label="Plagiat" value={3} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <LecturerPanel className="p-5">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold text-gray-900">Tugas Terbaru</h2>
            <LecturerButton variant="ghost" onClick={() => navigate(`/classes/${course.id}/${selectedClass.id}?tab=evaluation`)}>
              Lihat Semua
            </LecturerButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="py-2">Nama</th>
                  <th className="py-2">Jobsheet</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {latestTasks.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">{item.name}</td>
                    <td className="py-3">{item.jobsheet}</td>
                    <td className="py-3">{item.status}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="font-semibold text-blue-700 hover:text-blue-900"
                        onClick={() => navigate(`/reviews/${item.id}`)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold text-gray-900">Progress Evaluasi</h2>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Evaluasi AI</p>
              <ProgressBar value={90} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Validasi Dosen</p>
              <ProgressBar value={progress || 10} />
            </div>
          </div>
        </LecturerPanel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <LecturerPanel className="p-5">
          <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Perlu Tindakan</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>3 laporan terindikasi plagiat</li>
            <li>7 laporan menunggu validasi</li>
          </ul>
        </LecturerPanel>
        <LecturerPanel className="p-5">
          <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Jobsheet Aktif</h2>
          <div className="space-y-3 text-sm">
            {selectedJobsheets.map((jobsheet) => (
              <div key={jobsheet.id} className="flex items-center justify-between gap-3">
                <span>Jobsheet {jobsheet.number}</span>
                <span>{jobsheet.deadline}</span>
                <span>{jobsheet.submitted}/{jobsheet.total}</span>
              </div>
            ))}
          </div>
        </LecturerPanel>
      </section>
    </LecturerLayout>
  )
}
