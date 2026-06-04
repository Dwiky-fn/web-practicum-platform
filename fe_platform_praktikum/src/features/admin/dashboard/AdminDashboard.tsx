import { BookOpen, GraduationCap, Layers, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminButton, AdminPanel, AdminSectionHeader } from "../components/AdminUI"
import {
  academicClasses,
  academicCourses,
  adminActivities,
  adminLecturers,
  adminStudents,
  semesters,
} from "../data/adminData"

function StatCard({
  title,
  value,
  caption,
  icon,
}: {
  title: string
  value: string
  caption: string
  icon: React.ReactNode
}) {
  return (
    <AdminPanel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{caption}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-blue-700">{icon}</div>
      </div>
    </AdminPanel>
  )
}

function SummaryPanel({
  title,
  rows,
}: {
  title: string
  rows: Array<[string, string | number]>
}) {
  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-6">
            <dt className="text-gray-600">{label}</dt>
            <dd className="font-semibold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </AdminPanel>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const activeSemester = semesters.find((semester) => semester.status === "Aktif")
  const activeCourses = academicCourses.filter((course) => course.status === "Aktif")
  const activeClasses = academicClasses.filter((item) => item.status === "Aktif")

  return (
    <AdminLayout>
      <AdminSectionHeader
        title="Dashboard Admin"
        description="Ringkasan kesiapan akademik dan aktivitas sistem praktikum."
        actions={
          <AdminButton variant="secondary">
            Semester Aktif: {activeSemester?.year} - {activeSemester?.term}
          </AdminButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Mahasiswa"
          value={String(adminStudents.length)}
          caption={`${adminStudents.filter((item) => item.status === "Aktif").length} aktif`}
          icon={<GraduationCap size={24} />}
        />
        <StatCard
          title="Dosen"
          value={String(adminLecturers.length)}
          caption={`${adminLecturers.filter((item) => item.status === "Aktif").length} aktif`}
          icon={<Users size={24} />}
        />
        <StatCard
          title="Mata Kuliah"
          value={String(activeCourses.length)}
          caption="Aktif semester ini"
          icon={<BookOpen size={24} />}
        />
        <StatCard
          title="Kelas"
          value={String(activeClasses.length)}
          caption="Sedang berjalan"
          icon={<Layers size={24} />}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Status Akademik Semester {activeSemester?.year}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Ringkasan kesiapan akademik pada semester aktif.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SummaryPanel
            title="Struktur Akademik"
            rows={[
              ["Mata Kuliah", academicCourses.length],
              ["Total Kelas", academicClasses.length],
              ["Kelas Aktif", activeClasses.length],
              ["Kelas Nonaktif", academicClasses.filter((item) => item.status === "Nonaktif").length],
            ]}
          />
          <SummaryPanel
            title="Dosen Pengampu"
            rows={[
              ["Total Dosen", adminLecturers.length],
              ["Sudah Mengajar", activeClasses.length],
              ["Belum Ter-assign", Math.max(adminLecturers.length - activeClasses.length, 0)],
            ]}
          />
          <SummaryPanel
            title="Mahasiswa"
            rows={[
              ["Total Mahasiswa", adminStudents.length],
              ["Sudah Masuk Kelas", adminStudents.length],
              ["Belum Masuk Kelas", 0],
            ]}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="pb-2 font-semibold">Waktu</th>
                  <th className="pb-2 font-semibold">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminActivities.map(([time, activity]) => (
                  <tr key={`${time}-${activity}`}>
                    <td className="py-2 text-gray-600">{time}</td>
                    <td className="py-2 text-gray-900">{activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
          <div className="mt-4 grid gap-3">
            <AdminButton onClick={() => navigate("/admin/academic?tab=courses")}>
              Tambah Mata Kuliah
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/admin/academic?tab=classes")}>
              Tambah Kelas
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/admin/users/lecturers")}>
              Kelola Dosen
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/admin/users/students")}>
              Kelola Mahasiswa
            </AdminButton>
          </div>
        </AdminPanel>
      </section>
    </AdminLayout>
  )
}
