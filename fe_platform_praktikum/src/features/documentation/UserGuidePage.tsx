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
  UserCheck,
  Users,
} from "lucide-react"
import { useCurrentUser } from "../../services/user/useCurrentUser"

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
  const defaultTab: RoleTab =
    user?.role === "DOSEN" ? "dosen" : user?.role === "MAHASISWA" ? "mahasiswa" : "admin"

  const [activeTab, setActiveTab] = useState<RoleTab>(defaultTab)
  const [searchTerm, setSearchTerm] = useState("")

  const dosenTopics: Topic[] = [
    {
      id: "dashboard-overview",
      title: "Dashboard Dosen & Metrik Pembelajaran",
      icon: Layers,
      description: "Memahami indikator Progres Pembelajaran, Menunggu Review, dan Deadline Mendatang.",
      content: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Dashboard Dosen dirancang untuk memberikan gambaran umum secara cepat mengenai perkembangan pengerjaan praktikum di kelas yang diampu:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kartu Progres Pembelajaran:</strong> Menampilkan posisi perkuliahan saat ini (misalnya <em>Jobsheet 3 dari 10</em>) serta jumlah mahasiswa yang telah menyelesaikan submission. Klik tombol <strong>Detail</strong> untuk melihat matriks pengerjaan seluruh mahasiswa.
            </li>
            <li>
              <strong>Kartu Menunggu Review:</strong> Menampilkan total laporan/submission mahasiswa yang berstatus <em>Terkumpul</em> dan memerlukan masukan/penilaian dari Dosen.
            </li>
            <li>
              <strong>Kartu Deadline Mendatang:</strong> Menampilkan jobsheet yang dipublish yang memiliki batas waktu paling dekat.
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
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Halaman Monitoring Dosen menyajikan data pengerjaan mahasiswa secara terukur:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Aktivitas Terakhir (Durasi Relative):</strong> Menunjukkan kapan mahasiswa terakhir kali melakukan aksi di workspace (misal <em>15 menit yang lalu</em> atau <em>2 jam yang lalu</em>).
            </li>
            <li>
              <strong>Penghitungan Progres Akumulatif:</strong> Nilai persentase progres mahasiswa dihitung berdasarkan <strong>Bobot Percobaan</strong> + <strong>Bobot Latihan</strong> yang telah berhasil diselesaikan secara bertahap.
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
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
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
              <strong>Auto-Submit pada Deadline:</strong> Apabila batas waktu (deadline) terlampaui, sistem secara otomatis menandai pekerjaan mahasiswa yang belum dikumpulkan menjadi berstatus <em>Terkumpul (Auto-Submit)</em> berdasarkan progres kode terakhir yang tersimpan.
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
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
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
      title: "Deadline, Nilai Progres & Revisi",
      icon: CheckCircle,
      description: "Memahami batas waktu, perhitungan persentase progres, dan permintaan revisi.",
      content: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Ketentuan penilaian dan penyelesaian tugas praktikum:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Indikator Progres:</strong> Persentase progres di dashboard mahasiswa menggambarkan total bobot bagian percobaan dan latihan yang sudah Anda selesaikan.
            </li>
            <li>
              <strong>Batas Waktu (Deadline):</strong> Jika Anda belum sempat mengumpulkan laporan hingga tenggat waktu tiba, sistem akan mengumpulkan draf pengerjaan Anda secara otomatis.
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
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Ketentuan penambahan dan pemindahan mahasiswa pada Kelas Semester:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Validasi Status Aktif:</strong> Mahasiswa berstatus <strong>Cuti</strong> atau <strong>Non-Aktif</strong> tidak akan dimunculkan dalam opsi pendaftaran/rolling kelas semester.
            </li>
            <li>
              <strong>Filter Semester Mahasiswa:</strong> Kandidat mahasiswa disaring berdasarkan semester aktifnya. Mahasiswa tidak dapat dimasukkan melompat ke semester tinggi tanpa riwayat akademik, kecuali jika ditandai sebagai <em>Mahasiswa Pindahan</em>.
            </li>
            <li>
              <strong>Rolling Kelas Otomatis:</strong> Fitur naik kelas memindahkan mahasiswa dari semester $N$ langsung ke semester $N+1$ tanpa prompt yang membingungkan.
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
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Pengelolaan Kurikulum dan Kelas Praktikum:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Multi-Kurikulum Aktif:</strong> Sistem mendukung lebih dari 1 kurikulum aktif secara bersamaan (misal Kurikulum 2018 dan Kurikulum 2024).
            </li>
            <li>
              <strong>Penyaringan Mata Kuliah Ganjil/Genap:</strong> Pada pembuatan Kelas Praktikum, admin memilih Kurikulum Aktif terlebih dahulu. Sistem secara otomatis menyaring mata kuliah yang sesuai dengan tipe semester (Genap untuk semester 2, 4, 6; Ganjil untuk semester 1, 3, 5).
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

  const currentTopics = topicsMap[activeTab].filter(
    (item) =>
      !searchTerm.trim() ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <BookOpen className="h-7 w-7 text-blue-600" /> Buku Panduan System
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Dokumentasi resmi dan panduan penggunaan platform praktikum interaktif.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari topik panduan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Role Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("dosen")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === "dosen"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Users className="h-4 w-4" /> Panduan Dosen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mahasiswa")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === "mahasiswa"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <BookOpen className="h-4 w-4" /> Panduan Mahasiswa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === "admin"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Panduan Admin
            </button>
          </nav>
        </div>

        {/* Content Section */}
        {currentTopics.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-base font-medium">Tidak ada topik panduan yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentTopics.map((topic) => {
              const IconComp = topic.icon
              return (
                <div
                  key={topic.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{topic.title}</h2>
                      <p className="text-sm text-gray-500">{topic.description}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">{topic.content}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
