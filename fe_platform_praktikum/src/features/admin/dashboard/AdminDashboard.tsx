import { BookOpen, GraduationCap, Layers, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminButton, AdminPanel, AdminSectionHeader } from "../components/AdminUI"
import { getAdminDashboard } from "../../../services/admin/service"
import type { AdminDashboardSummary } from "../../../services/admin/types"
import { academicDataApi } from "../../../services/admin/academicData/service"
import { toast } from "../../../components/toast/toastStore"

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

function StatCardSkeleton() {
  return (
    <AdminPanel className="p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-250 rounded w-1/2"></div>
          <div className="h-8 bg-gray-350 rounded w-1/3 mt-2"></div>
          <div className="h-4 bg-gray-250 rounded w-2/3 mt-1"></div>
        </div>
        <div className="rounded-lg bg-gray-100 p-6 text-gray-300">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    </AdminPanel>
  )
}

function SummaryPanelSkeleton() {
  return (
    <AdminPanel className="p-5 animate-pulse">
      <div className="h-5 bg-gray-350 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-350 rounded w-12"></div>
          </div>
        ))}
      </div>
    </AdminPanel>
  )
}

function ActivitiesSkeleton() {
  return (
    <div className="space-y-3 animate-pulse mt-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 py-2 border-b border-gray-100">
          <div className="h-4 bg-gray-250 rounded w-20"></div>
          <div className="h-4 bg-gray-350 rounded flex-1"></div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null)
  const [activeKurikulumName, setActiveKurikulumName] = useState("Belum ada")
  const [nativeStats, setNativeStats] = useState({
    mataKuliahTotal: 0,
    kelasPraktikumTotal: 0,
    kelasPraktikumAktif: 0,
    kelasMahasiswaTotal: 0,
    kelasMahasiswaAktif: 0,
    pengampuTotal: 0,
  })

  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingKurikulum, setLoadingKurikulum] = useState(true)
  const [loadingMataKuliah, setLoadingMataKuliah] = useState(true)
  const [loadingKelasPraktikum, setLoadingKelasPraktikum] = useState(true)
  const [loadingKelasMahasiswa, setLoadingKelasMahasiswa] = useState(true)
  const [loadingPengampu, setLoadingPengampu] = useState(true)

  useEffect(() => {
    // 1. Dashboard summary
    setLoadingDashboard(true)
    getAdminDashboard()
      .then((data) => {
        setDashboard(data)
      })
      .catch((err) => {
        toast.error("Gagal memuat ringkasan dashboard: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingDashboard(false))

    // 2. Kurikulum
    setLoadingKurikulum(true)
    academicDataApi.getKurikulum()
      .then((data) => {
        setActiveKurikulumName(data.find((item) => item.status === "active")?.nama_kurikulum ?? "Belum ada")
      })
      .catch((err) => {
        toast.error("Gagal memuat data kurikulum: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingKurikulum(false))

    // 3. Mata Kuliah
    setLoadingMataKuliah(true)
    academicDataApi.getMataKuliah()
      .then((data) => {
        setNativeStats(prev => ({ ...prev, mataKuliahTotal: data.length }))
      })
      .catch((err) => {
        toast.error("Gagal memuat data mata kuliah: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingMataKuliah(false))

    // 4. Kelas Praktikum
    setLoadingKelasPraktikum(true)
    academicDataApi.getKelasPraktikum()
      .then((data) => {
        setNativeStats(prev => ({
          ...prev,
          kelasPraktikumTotal: data.length,
          kelasPraktikumAktif: data.filter((item) => item.status === "open").length,
        }))
      })
      .catch((err) => {
        toast.error("Gagal memuat data kelas praktikum: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingKelasPraktikum(false))

    // 5. Kelas Mahasiswa
    setLoadingKelasMahasiswa(true)
    academicDataApi.getKelasMahasiswa()
      .then((data) => {
        setNativeStats(prev => ({
          ...prev,
          kelasMahasiswaTotal: data.length,
          kelasMahasiswaAktif: data.filter((item) => item.status === "active").length,
        }))
      })
      .catch((err) => {
        toast.error("Gagal memuat data kelas mahasiswa: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingKelasMahasiswa(false))

    // 6. Pengampu
    setLoadingPengampu(true)
    academicDataApi.getPengampu()
      .then((data) => {
        setNativeStats(prev => ({ ...prev, pengampuTotal: data.length }))
      })
      .catch((err) => {
        toast.error("Gagal memuat data pengampu: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingPengampu(false))
  }, [])

  const stats = dashboard?.stats
  const activeSemester = dashboard?.activeSemester

  return (
    <AdminLayout>
      <AdminSectionHeader
        title="Dashboard Admin"
        description="Ringkasan kesiapan akademik dan aktivitas sistem praktikum."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary">
              {loadingDashboard ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                `Semester Aktif: ${activeSemester ? `${activeSemester.year} - ${activeSemester.term}` : "Belum ada"}`
              )}
            </AdminButton>
            <span className="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700">
              {loadingKurikulum ? (
                <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                `Kurikulum Aktif: ${activeKurikulumName}`
              )}
            </span>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loadingDashboard ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Mahasiswa"
            value={String(stats?.students.total ?? 0)}
            caption={`${stats?.students.active ?? 0} aktif`}
            icon={<GraduationCap size={24} />}
          />
        )}
        {loadingDashboard ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Dosen"
            value={String(stats?.lecturers.total ?? 0)}
            caption={`${stats?.lecturers.active ?? 0} aktif`}
            icon={<Users size={24} />}
          />
        )}
        {loadingMataKuliah ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Mata Kuliah"
            value={String(nativeStats.mataKuliahTotal)}
            caption="Data Akademik native"
            icon={<BookOpen size={24} />}
          />
        )}
        {loadingKelasPraktikum ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Kelas Praktikum"
            value={String(nativeStats.kelasPraktikumAktif)}
            caption={`${nativeStats.kelasPraktikumTotal} total kelas praktikum`}
            icon={<Layers size={24} />}
          />
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Status Akademik Semester {activeSemester?.year}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Ringkasan kesiapan akademik pada semester aktif.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {loadingMataKuliah || loadingKelasPraktikum ? (
            <SummaryPanelSkeleton />
          ) : (
            <SummaryPanel
              title="Struktur Akademik"
              rows={[
                ["Mata Kuliah Native", nativeStats.mataKuliahTotal],
                ["Total Kelas Praktikum", nativeStats.kelasPraktikumTotal],
                ["Kelas Praktikum Aktif", nativeStats.kelasPraktikumAktif],
                ["Kelas Praktikum Nonaktif", Math.max(nativeStats.kelasPraktikumTotal - nativeStats.kelasPraktikumAktif, 0)],
              ]}
            />
          )}

          {loadingDashboard || loadingPengampu || loadingKelasPraktikum ? (
            <SummaryPanelSkeleton />
          ) : (
            <SummaryPanel
              title="Dosen Pengampu"
              rows={[
                ["Total Dosen", stats?.lecturers.total ?? 0],
                ["Relasi Pengampu", nativeStats.pengampuTotal],
                ["Kelas Praktikum Berjalan", nativeStats.kelasPraktikumAktif],
              ]}
            />
          )}

          {loadingDashboard || loadingKelasMahasiswa ? (
            <SummaryPanelSkeleton />
          ) : (
            <SummaryPanel
              title="Mahasiswa"
              rows={[
                ["Total Mahasiswa", stats?.students.total ?? 0],
                ["Kelas Mahasiswa", nativeStats.kelasMahasiswaTotal],
                ["Kelas Mahasiswa Aktif", nativeStats.kelasMahasiswaAktif],
              ]}
            />
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
          {loadingDashboard ? (
            <ActivitiesSkeleton />
          ) : (
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
          )}
        </AdminPanel>

        <AdminPanel className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
          <div className="mt-4 grid gap-3">
            <AdminButton onClick={() => navigate("/admin/academic/mata-kuliah")}>
              Tambah Mata Kuliah
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/admin/academic/kelas-praktikum")}>
              Tambah Kelas Praktikum
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
