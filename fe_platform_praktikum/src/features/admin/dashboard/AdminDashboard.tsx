import { ArrowUpRight, BookOpen, Clock, GraduationCap, Layers, ShieldCheck, Sparkles, UserPlus, Users, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminPanel } from "../components/AdminUI"
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
  })

  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingKurikulum, setLoadingKurikulum] = useState(true)
  const [loadingMataKuliah, setLoadingMataKuliah] = useState(true)
  const [loadingKelasPraktikum, setLoadingKelasPraktikum] = useState(true)

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

    // 4. Kelas Praktikum (Hanya ambil kelas praktikum pada semester aktif)
    setLoadingKelasPraktikum(true)
    academicDataApi.getKelasPraktikum({ scope: "active" })
      .then((activeClasses) => {
        setNativeStats((prev) => ({
          ...prev,
          kelasPraktikumAktif: activeClasses.length,
        }))
      })
      .catch((err) => {
        toast.error("Gagal memuat data kelas praktikum: " + (err instanceof Error ? err.message : ""))
      })
      .finally(() => setLoadingKelasPraktikum(false))
  }, [])

  const stats = dashboard?.stats
  const activeSemester = dashboard?.activeSemester
  const unassignedStudents = dashboard?.stats.unassignedStudents ?? 0

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
              Administrator Platform Praktikum Pemrograman
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Pusat pengawasan status akademik, manajemen pengguna, dan alokasi kelas praktikum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-300" />
              {loadingDashboard ? "Memuat..." : `Semester: ${activeSemester ? `${activeSemester.year} - ${activeSemester.term}` : "Belum ada"}`}
            </span>
            <span className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              {loadingKurikulum ? "Memuat..." : `Kurikulum: ${activeKurikulumName}`}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Utama */}
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
            caption="Mata Kuliah Kurikulum Aktif"
            icon={<BookOpen size={22} />}
          />
        )}
        {loadingKelasPraktikum ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Kelas Praktikum"
            value={String(nativeStats.kelasPraktikumAktif)}
            caption="Semester Aktif Saat Ini"
            icon={<Layers size={22} />}
          />
        )}
      </div>

      {/* Grid Utama Layout Dashboard */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        
        {/* Ringkasan Status Mahasiswa & Kelas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card Alokasi Mahasiswa Ke Kelas */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Status Alokasi Mahasiswa Per Semester
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500">Mahasiswa Terploting Kelas</p>
                  <p className="text-2xl font-extrabold text-blue-700 mt-1">{stats?.assignedStudents ?? 0}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-800">Mahasiswa Belum Masuk Kelas</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{unassignedStudents}</p>
                </div>
                {unassignedStudents > 0 ? (
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                )}
              </div>
            </div>

            {unassignedStudents > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-center justify-between text-xs text-amber-900">
                <span>Terdapat <strong>{unassignedStudents} mahasiswa</strong> yang belum dimasukkan ke kelas semester aktif.</span>
                <button
                  type="button"
                  onClick={() => navigate("/admin/academic/kelas-mahasiswa")}
                  className="font-bold text-amber-900 underline hover:text-amber-950 transition shrink-0 ml-2 cursor-pointer"
                >
                  Alokasikan Sekarang →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Kolom): Aksi Cepat Admin */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm sticky top-6">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Navigasi Cepat Admin
            </h2>
            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/admin/academic/mata-kuliah")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-xs font-bold text-gray-800 hover:text-blue-900 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600" />
                  Kelola Mata Kuliah
                </span>
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/academic/kelas-praktikum")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-xs font-bold text-gray-800 hover:text-blue-900 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  Kelola Kelas Praktikum
                </span>
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/academic/kelas-mahasiswa")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-xs font-bold text-gray-800 hover:text-blue-900 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap size={16} className="text-amber-600" />
                  Kelola Kelas Mahasiswa
                </span>
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/users/lecturers")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-xs font-bold text-gray-800 hover:text-blue-900 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-cyan-600" />
                  Kelola Data Dosen
                </span>
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/users/students")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-xs font-bold text-gray-800 hover:text-blue-900 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <UserPlus size={16} className="text-emerald-600" />
                  Kelola Data Mahasiswa
                </span>
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
