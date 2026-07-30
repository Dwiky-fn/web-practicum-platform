import { useState, type ReactNode } from "react"
import {
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import Navbar from "../../components/navbar/Navbar"
import AdminLayout from "../admin/components/AdminLayout"
import LecturerLayout from "../lecturer/components/LecturerLayout"
import TopProgressBar from "../../components/loading/TopProgressBar"

type RoleTab = "dosen" | "mahasiswa" | "admin"

interface Topic {
  id: string
  title: string
  icon: typeof BookOpen
  description: string
  content: ReactNode
}

export default function UserGuidePage() {
  const { user } = useCurrentUser()
  const activeRoleTab: RoleTab =
    user?.role === "DOSEN" ? "dosen" : user?.role === "MAHASISWA" ? "mahasiswa" : "admin"

  const [searchTerm, setSearchTerm] = useState("")

  const dosenTopics: Topic[] = [
    {
      id: "dashboard-overview",
      title: "Dashboard Dosen & Progres Kelas",
      icon: Layers,
      description: "Memahami indikator Progres Pembelajaran, Menunggu Review, dan Batas Waktu Mendatang.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Dashboard Dosen dirancang untuk memberikan gambaran umum secara cepat mengenai perkembangan pengerjaan praktikum di kelas yang diampu:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kartu Progres Pembelajaran:</strong> Menampilkan posisi perkuliahan saat ini (misalnya <em>Jobsheet 3 dari 10</em>) serta jumlah mahasiswa yang telah menyelesaikan submission. Klik tombol <strong>Detail</strong> untuk melihat matriks pengerjaan seluruh mahasiswa.
            </li>
            <li>
              <strong>Kartu Menunggu Review:</strong> Menampilkan total jobsheet/submission mahasiswa yang berstatus <em>Terkumpul</em> dan memerlukan masukan/penilaian dari Dosen.
            </li>
            <li>
              <strong>Kartu Batas Waktu Mendatang:</strong> Menampilkan jobsheet yang dipublish yang memiliki batas waktu paling dekat.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "monitoring-activity",
      title: "Monitoring Praktikum & Aktivitas Terakhir",
      icon: Clock,
      description: "Cara memantau pengerjaan mahasiswa secara real-time melalui fitur Monitoring.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman Detail Kelas &amp; Monitoring Dosen menyajikan data pengerjaan mahasiswa secara terukur:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Aktivitas Terakhir:</strong> Menunjukkan kapan mahasiswa terakhir kali melakukan pengumpulan jobsheet atau aksi di workspace.
            </li>
            <li>
              <strong>Penghitungan Progres Akumulatif:</strong> Nilai persentase progres mahasiswa dihitung berdasarkan <strong>Bobot Percobaan</strong> + <strong>Bobot Latihan</strong> yang telah berhasil diselesaikan.
            </li>
            <li>
              <strong>Live Workspace:</strong> Dosen dapat mengklik tombol <em>Lihat Live Workspace</em> pada mahasiswa tertentu untuk memantau kode yang sedang diketik atau diuji.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "jobsheet-status",
      title: "Status Draft vs Published Jobsheet",
      icon: FileText,
      description: "Pengaturan visibilitas jobsheet serta ketentuan Auto-Submit.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Setiap Jobsheet memiliki status yang menentukan aksesibilitas bagi mahasiswa:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Draft:</strong> Jobsheet dalam tahap penyusunan oleh Dosen. Jobsheet berstatus Draft <em>tidak dapat dilihat</em> dan <em>tidak dapat dikerjakan</em> oleh mahasiswa.
            </li>
            <li>
              <strong>Published:</strong> Jobsheet yang sudah disetujui untuk dibagikan ke kelas praktikum. Mahasiswa dapat melihat materi dan melakukan pengerjaan.
            </li>
            <li>
              <strong>Auto-Submit pada Batas Waktu:</strong> Apabila batas waktu (deadline) terlampaui, sistem secara otomatis menandai pekerjaan mahasiswa yang belum dikumpulkan menjadi berstatus <em>Terkumpul (Auto-Submit)</em> berdasarkan progres kode terakhir.
            </li>
          </ul>
        </div>
      ),
    },
  ]

  const mahasiswaTopics: Topic[] = [
    {
      id: "workspace-flow",
      title: "Pengerjaan Percobaan & Latihan Kode",
      icon: BookOpen,
      description: "Alur pengerjaan praktikum pada IDE Workspace online.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Mahasiswa dapat menyelesaikan setiap Jobsheet dengan urutan langkah berikut:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Buka modul Jobsheet yang berstatus <strong>Published</strong>.</li>
            <li>Pelajari instruksi dan lakukan pengerjaan kode pada editor workspace yang tersedia.</li>
            <li>Gunakan tombol <strong>Run Code</strong> untuk menguji program. Sistem akan mencatat riwayat eksekusi kode.</li>
            <li>Selesaikan setiap Percobaan dan Latihan sesuai bobot persentase yang ditentukan.</li>
            <li>Klik <strong>Kumpulkan / Submit</strong> sebelum batas waktu berakhir.</li>
          </ol>
        </div>
      ),
    },
    {
      id: "deadline-progress",
      title: "Tenggat Waktu, Nilai Progres & Revisi",
      icon: CheckCircle,
      description: "Memahami batas waktu, perhitungan persentase progres, dan permintaan revisi.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Ketentuan penilaian dan penyelesaian tugas praktikum:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Indikator Progres:</strong> Persentase progres di dashboard mahasiswa menggambarkan total bobot bagian percobaan dan latihan yang sudah Anda selesaikan.
            </li>
            <li>
              <strong>Batas Waktu (Deadline):</strong> Jika Anda belum sempat mengumpulkan jobsheet hingga tenggat waktu tiba, sistem akan mengumpulkan draf pengerjaan Anda secara otomatis.
            </li>
            <li>
              <strong>Status Revisi/Remedial:</strong> Dosen dapat mengembalikan submission dengan catatan revisi. Anda dapat memperbaiki kode dan melakukan pengiriman ulang.
            </li>
          </ul>
        </div>
      ),
    },
  ]

  const adminTopics: Topic[] = [
    {
      id: "academic-rolling",
      title: "Manajemen Mahasiswa, Rolling & Validasi Cuti",
      icon: UserCheck,
      description: "Aturan pendaftaran mahasiswa ke kelas semester dan pengolahan status akademik.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Ketentuan penambahan dan pemindahan mahasiswa pada Kelas Semester:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Validasi Status Aktif:</strong> Mahasiswa berstatus <strong>Cuti</strong> atau <strong>Non-Aktif</strong> tidak akan dimunculkan dalam opsi pendaftaran/rolling kelas semester.
            </li>
            <li>
              <strong>Filter Semester Mahasiswa:</strong> Kandidat mahasiswa disaring berdasarkan semester aktifnya.
            </li>
            <li>
              <strong>Rolling Kelas Otomatis:</strong> Fitur naik kelas memindahkan mahasiswa dari semester N ke semester N+1 secara teratur.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "curriculum-courses",
      title: "Multi-Kurikulum & Pemilihan Mata Kuliah (Ganjil/Genap)",
      icon: ShieldCheck,
      description: "Pengaturan kurikulum aktif dan pemfilteran mata kuliah berdasarkan semester.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Pengelolaan Kurikulum dan Kelas Praktikum:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Multi-Kurikulum Aktif:</strong> Sistem mendukung lebih dari 1 kurikulum aktif secara bersamaan (misal Kurikulum 2018 dan Kurikulum 2024).
            </li>
            <li>
              <strong>Penyaringan Mata Kuliah Ganjil/Genap:</strong> Pada pembuatan Kelas Praktikum, admin memilih Kurikulum Aktif terlebih dahulu.
            </li>
          </ul>
        </div>
      ),
    },
  ]

  const topicsMap: Record<RoleTab, Topic[]> = {
    dosen: dosenTopics,
    mahasiswa: mahasiswaTopics,
    admin: adminTopics,
  }

  const roleLabelMap: Record<RoleTab, { roleName: string; subtitle: string; icon: typeof Users }> = {
    dosen: {
      roleName: "Dosen",
      subtitle: "Panduan operasional dan manajemen kelas praktikum khusus Dosen.",
      icon: Users,
    },
    mahasiswa: {
      roleName: "Mahasiswa",
      subtitle: "Panduan pengerjaan modul praktikum, IDE workspace online, dan penyerahan tugas.",
      icon: BookOpen,
    },
    admin: {
      roleName: "Administrator",
      subtitle: "Panduan konfigurasi akademik, master data, dan pengelolaan sistem untuk Administrator.",
      icon: ShieldCheck,
    },
  }

  const currentRoleInfo = roleLabelMap[activeRoleTab]
  const currentTopics = topicsMap[activeRoleTab].filter(
    (item) =>
      !searchTerm.trim() ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const pageContent = (
    <div className="space-y-6">
      {/* Hero Banner Panel */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Sparkles size={16} className="text-yellow-400" />
              Dokumentasi &amp; Panduan Penggunaan
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
              Panduan {currentRoleInfo.roleName}
            </h1>
            <p className="mt-0.5 text-xs text-blue-200">
              {currentRoleInfo.subtitle}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari topik panduan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-9 pr-4 text-xs font-medium text-white placeholder-blue-200 backdrop-blur-md focus:border-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content Topics khusus role yang login */}
      {currentTopics.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-sm">
          <HelpCircle className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-bold text-gray-700">Tidak ada topik panduan yang cocok dengan kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {currentTopics.map((topic) => {
            const IconComp = topic.icon
            return (
              <div
                key={topic.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{topic.title}</h2>
                    <p className="text-xs text-gray-500">{topic.description}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">{topic.content}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (user?.role === "ADMIN") {
    return (
      <AdminLayout>
        <TopProgressBar />
        {pageContent}
      </AdminLayout>
    )
  }

  if (user?.role === "DOSEN") {
    return (
      <LecturerLayout>
        {pageContent}
      </LecturerLayout>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {pageContent}
      </main>
    </div>
  )
}
