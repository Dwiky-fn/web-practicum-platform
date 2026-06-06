import { BookOpen, GraduationCap, Layers, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminButton, AdminPanel, AdminSectionHeader } from "../components/AdminUI"
import { getAdminDashboard } from "../../../services/admin/service"
import type { AdminDashboardSummary } from "../../../services/admin/types"

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
  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getAdminDashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat dashboard admin"))
  }, [])

  const stats = dashboard?.stats
  const activeSemester = dashboard?.activeSemester

  return (
    <AdminLayout>
      <AdminSectionHeader
        title="Dashboard Admin"
        description="Ringkasan kesiapan akademik dan aktivitas sistem praktikum."
        actions={
          <AdminButton variant="secondary">
            Semester Aktif: {activeSemester ? `${activeSemester.year} - ${activeSemester.term}` : "Belum ada"}
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Mahasiswa"
          value={String(stats?.students.total ?? 0)}
          caption={`${stats?.students.active ?? 0} aktif`}
          icon={<GraduationCap size={24} />}
        />
        <StatCard
          title="Dosen"
          value={String(stats?.lecturers.total ?? 0)}
          caption={`${stats?.lecturers.active ?? 0} aktif`}
          icon={<Users size={24} />}
        />
        <StatCard
          title="Mata Kuliah"
          value={String(stats?.courses.active ?? 0)}
          caption="Aktif semester ini"
          icon={<BookOpen size={24} />}
        />
        <StatCard
          title="Kelas"
          value={String(stats?.classes.active ?? 0)}
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
              ["Mata Kuliah", stats?.courses.total ?? 0],
              ["Total Kelas", stats?.classes.total ?? 0],
              ["Kelas Aktif", stats?.classes.active ?? 0],
              ["Kelas Nonaktif", Math.max((stats?.classes.total ?? 0) - (stats?.classes.active ?? 0), 0)],
            ]}
          />
          <SummaryPanel
            title="Dosen Pengampu"
            rows={[
              ["Total Dosen", stats?.lecturers.total ?? 0],
              ["Sudah Mengajar", stats?.classes.active ?? 0],
              ["Belum Ter-assign", Math.max((stats?.lecturers.total ?? 0) - (stats?.classes.active ?? 0), 0)],
            ]}
          />
          <SummaryPanel
            title="Mahasiswa"
            rows={[
              ["Total Mahasiswa", stats?.students.total ?? 0],
              ["Sudah Masuk Kelas", stats?.assignedStudents ?? 0],
              ["Belum Masuk Kelas", stats?.unassignedStudents ?? 0],
            ]}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-130 text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="pb-2 font-semibold">Waktu</th>
                  <th className="pb-2 font-semibold">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(dashboard?.activities ?? []).map(({ time, activity }) => (
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
            <AdminButton onClick={() => navigate("/courses?tab=courses")}>
              Tambah Mata Kuliah
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/courses?tab=classes")}>
              Tambah Kelas
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/users/lecturers")}>
              Kelola Dosen
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/users/students")}>
              Kelola Mahasiswa
            </AdminButton>
          </div>
        </AdminPanel>
      </section>
    </AdminLayout>
  )
}
