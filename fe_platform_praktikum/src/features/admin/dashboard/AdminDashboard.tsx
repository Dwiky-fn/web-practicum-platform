import { BookOpen, GraduationCap, Layers, Sparkles, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminButton, AdminPanel } from "../components/AdminUI"
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
    <div className="group flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/20 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">{title}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-transform group-hover:scale-110">
          {icon}
        </div>
      </div>
      <div>
        <p className="mt-3 text-3xl font-extrabold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{caption}</p>
      </div>
    </div>
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
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">{title}</h3>
      <dl className="mt-3 space-y-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-gray-50 pb-1.5">
            <dt className="text-gray-600">{label}</dt>
            <dd className="font-bold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <AdminPanel className="p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-300 rounded w-1/3 mt-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-1"></div>
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
      <div className="h-5 bg-gray-300 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-12"></div>
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
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-300 rounded flex-1"></div>
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
    Promise.all([
      academicDataApi.getKelasPraktikum({ scope: "all" }),
      academicDataApi.getKelasPraktikum({ scope: "active" }),
    ])
      .then(([allClasses, activeClasses]) => {
        const activeCount = activeClasses.filter((item) => {
          const st = String((item as any).tahun_semester_status || (item as any).tahunSemesterStatus || "active").toLowerCase()
          return st === "active" || st === "aktif"
        }).length

        setNativeStats((prev) => ({
          ...prev,
          kelasPraktikumTotal: allClasses.length,
          kelasPraktikumAktif: activeCount,
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
      {/* Hero Banner Panel */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Sparkles size={16} className="text-yellow-400" />
              Kontrol Sistem Akademik
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">
              Administrator Platform Praktikum
            </h2>
            <p className="text-xs text-blue-200">
              Kelola data master akademik, registrasi dosen &amp; mahasiswa, serta konfigurasi kurikulum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/10">
              {loadingDashboard ? "Memuat..." : `Semester: ${activeSemester ? `${activeSemester.year} - ${activeSemester.term}` : "Belum ada"}`}
            </span>
            <span className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/10">
              {loadingKurikulum ? "Memuat..." : `Kurikulum: ${activeKurikulumName}`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loadingDashboard ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Total Mahasiswa"
            value={String(stats?.students.total ?? 0)}
            caption={`${stats?.students.active ?? 0} Mahasiswa Aktif`}
            icon={<GraduationCap size={22} />}
          />
        )}
        {loadingDashboard ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Total Dosen"
            value={String(stats?.lecturers.total ?? 0)}
            caption={`${stats?.lecturers.active ?? 0} Dosen Aktif`}
            icon={<Users size={22} />}
          />
        )}
        {loadingMataKuliah ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Mata Kuliah"
            value={String(nativeStats.mataKuliahTotal)}
            caption="Data Akademik Terdaftar"
            icon={<BookOpen size={22} />}
          />
        )}
        {loadingKelasPraktikum ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Kelas Praktikum"
            value={String(nativeStats.kelasPraktikumAktif)}
            caption={`${nativeStats.kelasPraktikumTotal} Total Kelas`}
            icon={<Layers size={22} />}
          />
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          Status Akademik Semester {activeSemester?.year ?? "-"}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Ringkasan kesiapan akademik pada semester aktif.
        </p>

        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {loadingMataKuliah || loadingKelasPraktikum ? (
            <SummaryPanelSkeleton />
          ) : (
            <SummaryPanel
              title="Struktur Akademik"
              rows={[
                ["Mata Kuliah", nativeStats.mataKuliahTotal],
                ["Total Kelas Praktikum", nativeStats.kelasPraktikumTotal],
                ["Kelas Praktikum Aktif", nativeStats.kelasPraktikumAktif],
              ]}
            />
          )}

          {loadingDashboard || loadingPengampu || loadingKelasPraktikum ? (
            <SummaryPanelSkeleton />
          ) : (
            <SummaryPanel
              title="Dosen"
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Aktivitas Terbaru</h2>
          {loadingDashboard ? (
            <ActivitiesSkeleton />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-130 text-xs">
                <thead>
                  <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-2 font-bold">Waktu Log</th>
                    <th className="pb-2 font-bold">Aktivitas Sistem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(dashboard?.activities ?? []).map(({ time, activity }) => (
                    <tr key={`${time}-${activity}`} className="hover:bg-gray-50/80">
                      <td className="py-2.5 text-gray-500 font-mono">{time}</td>
                      <td className="py-2.5 font-medium text-gray-900">{activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Aksi Cepat Admin</h2>
          <div className="mt-4 grid gap-3">
            <AdminButton onClick={() => navigate("/admin/academic/mata-kuliah")}>
              Tambah Mata Kuliah
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/admin/academic/kelas-praktikum")}>
              Tambah Kelas Praktikum
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/users/lecturers")}>
              Kelola Data Dosen
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => navigate("/users/students")}>
              Kelola Data Mahasiswa
            </AdminButton>
          </div>
        </div>
      </section>
    </AdminLayout>
  )
}
