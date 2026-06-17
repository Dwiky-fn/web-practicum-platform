import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Home } from "lucide-react"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import Navbar from "../../components/navbar/Navbar"
import AdminLayout from "../admin/components/AdminLayout"

export default function NotFoundPage() {
  const { user } = useCurrentUser()
  const navigate = useNavigate()

  const roleConfig = useMemo(() => {
    if (!user) {
      return {
        accentBg: "bg-blue-600 hover:bg-blue-700 text-white",
        accentText: "text-blue-700",
        accentBorder: "border-blue-200",
        dotColor: "bg-blue-400",
        title: "Halaman Tidak Ditemukan",
        description: "Halaman yang kamu cari tidak tersedia, sudah dipindahkan, atau mungkin URL-nya salah ketik.",
        buttonText: "Ke Halaman Login",
        targetPath: "/",
        terminalPath: "/halaman-tidak-ditemukan"
      }
    }

    if (user.role === "MAHASISWA") {
      return {
        accentBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
        accentText: "text-emerald-700",
        accentBorder: "border-emerald-200",
        dotColor: "bg-emerald-500",
        title: "Halaman Tidak Ditemukan",
        description: "Halaman praktikum atau laporan yang kamu cari tidak tersedia. Periksa kembali tautan dari dosen pembimbing.",
        buttonText: "Ke Dashboard Siswa",
        targetPath: "/dashboard",
        terminalPath: "/mahasiswa/404-tidak-ditemukan"
      }
    }

    if (user.role === "DOSEN") {
      return {
        accentBg: "bg-indigo-600 hover:bg-indigo-700 text-white",
        accentText: "text-indigo-700",
        accentBorder: "border-indigo-200",
        dotColor: "bg-indigo-500",
        title: "Konten Kelas Tidak Ditemukan",
        description: "Halaman monitoring, kelas praktikum, atau review yang kamu tuju tidak ditemukan atau belum dibuat.",
        buttonText: "Ke Dashboard Dosen",
        targetPath: "/dashboard",
        terminalPath: "/dosen/404-tidak-ditemukan"
      }
    }

    if (user.role === "ADMIN") {
      return {
        accentBg: "bg-violet-600 hover:bg-violet-700 text-white",
        accentText: "text-violet-700",
        accentBorder: "border-violet-200",
        dotColor: "bg-violet-500",
        title: "Sistem Data Tidak Ditemukan",
        description: "Halaman konfigurasi akademik, kurikulum, atau data master yang Anda cari tidak terdaftar dalam sistem native.",
        buttonText: "Ke Dashboard Admin",
        targetPath: "/dashboard",
        terminalPath: "/admin/404-tidak-ditemukan"
      }
    }

    return {
      accentBg: "bg-blue-600 hover:bg-blue-700 text-white",
      accentText: "text-blue-700",
      accentBorder: "border-blue-200",
      dotColor: "bg-blue-400",
      title: "Halaman Tidak Ditemukan",
      description: "Halaman yang kamu cari tidak tersedia, sudah dipindahkan, atau mungkin URL-nya salah ketik.",
      buttonText: "Ke Dashboard",
      targetPath: "/dashboard",
      terminalPath: "/404-tidak-ditemukan"
    }
  }, [user])

  const content = (
    <div className="text-center max-w-lg mx-auto font-sans">
      {/* 404 dekoratif */}
      <div className="relative mb-8 select-none">
        <p className="text-[140px] md:text-[160px] font-black text-gray-100 leading-none tracking-tighter">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-md px-6 py-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${roleConfig.dotColor}`} />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs md:text-sm text-gray-400 font-mono">
                {roleConfig.terminalPath}
              </span>
            </div>
            <p className="mt-3 text-xs md:text-sm text-gray-500 font-mono text-left">
              <span className="text-red-500">Error:</span> Page not found
            </p>
          </div>
        </div>
      </div>

      {/* Teks */}
      <h1 className="text-2xl font-bold text-gray-800 mb-3">
        {roleConfig.title}
      </h1>
      <p className="text-gray-500 mb-8 leading-relaxed text-sm md:text-base">
        {roleConfig.description}
      </p>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition text-sm font-medium cursor-pointer"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>

        <button
          onClick={() => navigate(roleConfig.targetPath)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${roleConfig.accentBg} transition text-sm font-medium shadow-sm cursor-pointer`}
        >
          <Home size={16} />
          {roleConfig.buttonText}
        </button>
      </div>
    </div>
  )

  if (user?.role === "ADMIN") {
    return (
      <AdminLayout>
        <div className="py-16 flex items-center justify-center px-6">
          {content}
        </div>
      </AdminLayout>
    )
  }

  if (user?.role === "MAHASISWA") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="py-20 flex items-center justify-center px-6">
          {content}
        </div>
      </div>
    )
  }

  // Lecturer layout is already wrapped in App.tsx, so render directly
  if (user?.role === "DOSEN") {
    return (
      <div className="py-16 flex items-center justify-center px-6">
        {content}
      </div>
    )
  }

  // Not logged in or generic fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      {content}
    </div>
  )
}