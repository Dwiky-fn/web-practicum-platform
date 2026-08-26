import { useState, type ReactNode } from "react"
import {
  BookOpen,
  CheckCircle,
  Code,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Monitor,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Eye,
} from "lucide-react"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import Navbar from "../../components/navbar/Navbar"
import Breadcrumbs from "../../components/Breadcrumbs"
import AdminLayout from "../admin/components/AdminLayout"
import LecturerLayout from "../lecturer/components/LecturerLayout"
import TopProgressBar from "../../components/loading/TopProgressBar"

type RoleTab = "dosen" | "mahasiswa" | "admin"

interface Topic {
  id: string
  pageName: string
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

  // ----------------------------------------------------------------------
  // PANDUAN DOSEN (Page-by-Page)
  // ----------------------------------------------------------------------
  const dosenTopics: Topic[] = [
    {
      id: "dosen-dashboard",
      pageName: "Halaman Dashboard Dosen (/dashboard)",
      title: "1. Dashboard & Ringkasan Pembelajaran",
      icon: LayoutDashboard,
      description: "Penjelasan fungsi indikator statistik dan tabel progres pembelajaran kelas.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman Dashboard Dosen berfungsi sebagai pusat kendali awal untuk melihat performa pembelajaran praktikum seluruh kelas yang Anda ampu:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kartu Statistik Ringkasan:</strong> Menampilkan jumlah kelas yang diampu, total mahasiswa aktif, jumlah jobsheet yang belum dievaluasi, dan jadwal deadline terdekat.
            </li>
            <li>
              <strong>Filter Mata Kuliah:</strong> Gunakan dropdown di banner utama untuk memfilter data ringkasan berdasarkan mata kuliah aktif tertentu.
            </li>
            <li>
              <strong>Tabel Progres Pembelajaran Kelas:</strong> Menampilkan pencapaian jobsheet terbit dibandingkan total jumlah jobsheet 1 semester per kelas. Klik tombol <strong>Detail</strong> pada baris kelas untuk berpindah langsung ke Halaman Detail Kelas.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-courses",
      pageName: "Halaman Daftar Mata Kuliah Dosen (/mata-kuliah)",
      title: "2. Daftar Mata Kuliah & Arsip Pengajaran",
      icon: BookOpen,
      description: "Manajemen daftar penugasan mata kuliah semester berjalan dan riwayat arsip.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini menampilkan seluruh kelompok mata kuliah yang Anda ampu:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Tab Semester Berjalan:</strong> Menampilkan mata kuliah aktif pada periode semester saat ini beserta daftar kelas praktikum yang diampu.
            </li>
            <li>
              <strong>Tab Riwayat Pengajaran:</strong> Menyimpan arsip perkuliahan dari semester-semester sebelumnya untuk keperluan rujukan atau peninjauan ulang.
            </li>
            <li>
              <strong>Navigasi Aksi:</strong> Setiap kartu mata kuliah memiliki tombol <strong>Kelola Jobsheet</strong> (untuk menyusun modul) dan tombol <strong>Detail Kelas</strong> (untuk mengelola mahasiswa &amp; evaluasi).
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-class-detail",
      pageName: "Halaman Detail Kelas Praktikum (/kelas-praktikum/:courseId/:classId)",
      title: "3. Pengelolaan Kelas Praktikum & Sesi Remedial",
      icon: Layers,
      description: "Pusat pengaturan modul, status rilis jobsheet, pendaftaran mahasiswa, sesi remedial, dan matriks nilai.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini merupakan tempat Dosen mengelola 1 kelas praktikum tertentu melalui 4 tab utama:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Tab Ringkasan Kelas:</strong> Menampilkan indikator total mahasiswa terdaftar, target jobsheet rencana 1 semester (dapat diubah dengan ikon pensil), jumlah jobsheet terbit, serta persentase progres evaluasi kelas.
            </li>
            <li>
              <strong>Tab Jobsheet Praktikum:</strong> Tempat mempublikasikan jobsheet (<em>Draft</em> ke <em>Published</em>), mengatur tanggal rilis &amp; deadline, serta membuka <strong>Sesi Remedial</strong> (menentukan periode waktu remedial &amp; memilih mahasiswa sasaran).
            </li>
            <li>
              <strong>Tab Daftar Mahasiswa:</strong> Menampilkan daftar mahasiswa terdaftar beserta NIM, Program Studi, dan tombol akses profil.
            </li>
            <li>
              <strong>Tab Evaluasi &amp; Nilai:</strong> Matriks rekapitulasi nilai dan status pengumpulan mahasiswa untuk seluruh jobsheet dalam 1 tabel yang dapat difilter.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-jobsheet-manage",
      pageName: "Halaman Kelola Jobsheet Praktikum (/mata-kuliah/:courseId/jobsheets)",
      title: "4. Manajemen Modul Jobsheet Mata Kuliah",
      icon: FileText,
      description: "Pembuatan, pengeditan, duplikasi, dan alokasi modul jobsheet praktikum.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini digunakan untuk mengelola repositori materi jobsheet dalam 1 mata kuliah:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Buat Jobsheet Baru:</strong> Tombol di kanan atas untuk membuat modul praktikum baru dari awal.
            </li>
            <li>
              <strong>Kartu Jobsheet:</strong> Menampilkan urutan bab, judul, deskripsi singkat, bahasa pemrograman (Java/Python), serta jumlah soal percobaan &amp; latihan.
            </li>
            <li>
              <strong>Opsi Aksi:</strong> Dosen dapat mengklik <strong>Edit Materi</strong> untuk mengubah isi soal, <strong>Duplikasi</strong> untuk menggandakan modul, atau <strong>Hapus</strong> jika tidak digunakan.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-jobsheet-editor",
      pageName: "Halaman Editor Jobsheet (/jobsheets/create & /jobsheets/:id/edit)",
      title: "5. Lembar Penyusun Modul & Kode Template (Editor Jobsheet)",
      icon: Code,
      description: "Penyusunan materi Teori, Percobaan, Latihan Kode, dan kunci output acuan.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman editor ini dirancang dengan Rich Text Editor &amp; Code Editor terintegrasi untuk menyusun modul:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Pilihan Bahasa Pemrograman:</strong> Memilih bahasa acuan pengerjaan (Java atau Python).
            </li>
            <li>
              <strong>Bagian 1 - Materi Teori:</strong> Tempat menuliskan konsep dasar praktikum, rumus, dan instruksi umum dengan format teks kaya (Rich Text).
            </li>
            <li>
              <strong>Bagian 2 - Soal Percobaan:</strong> Menambahkan langkah percobaan, kode template bawaan yang diberikan ke mahasiswa, serta output acuan eksekusi.
            </li>
            <li>
              <strong>Bagian 3 - Soal Latihan Kode:</strong> Menambahkan tantangan koding mandiri, petunjuk instruksi, persentase bobot nilai latihan, serta template struktur kode awal.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-jobsheet-detail",
      pageName: "Halaman Detail Jobsheet Dosen (/jobsheets/:jobsheetId)",
      title: "6. Pratinjau Content & Riwayat Pengumpulan Jobsheet",
      icon: FileCheck,
      description: "Meninjau tampilan akhir modul jobsheet dan memantau riwayat pengumpulan per kelas.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini menampilkan pratinjau (<em>preview</em>) modul jobsheet sebagaimana dilihat oleh mahasiswa:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Pratinjau Modul Lengkap:</strong> Menampilkan blok Teori, Percobaan, dan Latihan Kode beserta template editor yang disiapkan.
            </li>
            <li>
              <strong>Panel Informasi &amp; Alokasi Kelas:</strong> Informasi mengenai status rilis jobsheet pada kelas-kelas praktikum terkait.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-review-page",
      pageName: "Halaman Review Pengerjaan Mahasiswa (/reviews/:studentId)",
      title: "7. Evaluasi, Fitur AI & Penilaian Dosen (Review Page)",
      icon: CheckCircle,
      description: "Pemeriksaan kode mahasiswa, Bantuan Evaluasi AI, rekomendasi nilai, dan pemberian keputusan akhir.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini merupakan tempat Dosen menilai pengerjaan mahasiswa secara komprehensif:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Inspeksi Kode &amp; Uji Eksekusi:</strong> Memeriksa kode program, output terminal, dan analisis mahasiswa. Dosen dapat menguji ulang eksekusi kode di tempat.
            </li>
            <li>
              <strong>Bantuan Evaluasi AI (Picu Review AI):</strong> Klik tombol <strong>Picu Review AI</strong> untuk menjalankan evaluasi otomatis. AI akan mengisi rekomendasi skor dan ringkasan feedback per bagian (Percobaan &amp; Latihan) pada kolom kiri (<em>Rekomendasi AI</em>) serta komentar baris kode pada kolom kanan (<em>Komentar Kode</em>).
            </li>
            <li>
              <strong>Hapus Review AI:</strong> Jika ingin mengosongkan evaluasi AI, gunakan tombol <strong>Hapus Review AI</strong>.
            </li>
            <li>
              <strong>Penilaian &amp; Keputusan:</strong> Masukkan nilai pada Form Evaluasi Dosen, tuliskan umpan balik akhir, pilih keputusan (<strong>ACCEPTED / Diterima</strong> atau <strong>REVISION / Perlu Revisi</strong>), lalu klik <strong>Simpan Evaluasi</strong>.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-monitoring-page",
      pageName: "Halaman Live Monitoring & Live Workspace (/monitoring)",
      title: "8. Live Monitoring & Inspeksi Workspace Sesi Lab",
      icon: Monitor,
      description: "Pemantauan telemetry keaktifan pengerjaan koding mahasiswa di laboratorium secara real-time.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini digunakan Dosen saat sesi praktikum laboratorium berlangsung secara langsung:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Koneksi Telemetry WebSocket Live:</strong> Menerima sinyal keaktifan ketikan kode dan eksekusi terminal mahasiswa secara real-time.
            </li>
            <li>
              <strong>Status Keaktifan:</strong> Indikator status <em>Aktif</em> (sedang mengetik/menjalankan kode) vs <em>Idle</em>.
            </li>
            <li>
              <strong>Inspeksi Live Workspace:</strong> Klik tombol <strong>Inspeksi Workspace</strong> untuk melihat layar editor koding mahasiswa secara live tanpa mengganggu pengerjaannya.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "dosen-settings",
      pageName: "Halaman Pengaturan Profil & Keamanan (/settings)",
      title: "9. Pengaturan Akun & Keamanan OTP",
      icon: Settings,
      description: "Manajemen profil dosen, verifikasi OTP ubah kata sandi, dan ubah email.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Mengelola data akun dan keamanan login Dosen:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Ubah Password via OTP:</strong> Minta kode OTP 6-digit ke email terdaftar untuk mengubah kata sandi akun.
            </li>
            <li>
              <strong>Ubah Email via OTP:</strong> Verifikasi perubahan alamat email utama menggunakan kode OTP 6-digit.
            </li>
          </ul>
        </div>
      ),
    },
  ]

  // ----------------------------------------------------------------------
  // PANDUAN MAHASISWA (Page-by-Page)
  // ----------------------------------------------------------------------
  const mahasiswaTopics: Topic[] = [
    {
      id: "mhs-dashboard",
      pageName: "Halaman Dashboard Mahasiswa (/dashboard)",
      title: "1. Dashboard Utama & Pengingat Tugas",
      icon: LayoutDashboard,
      description: "Ringkasan mata kuliah terdaftar, jobsheet aktif, dan tenggat waktu pengumpulan.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Dashboard Mahasiswa merupakan pusat navigasi awal saat Anda masuk ke platform:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Ringkasan Aktivitas:</strong> Menampilkan kartu jumlah mata kuliah aktif yang diikuti dan progres penyelesaian jobsheet.
            </li>
            <li>
              <strong>Batas Waktu Terdekat (Deadline Alert):</strong> Mengingatkan modul praktikum yang harus segera dikumpulkan sebelum tenggat berakhir.
            </li>
            <li>
              <strong>Pintas Navigasi:</strong> Klik kartu mata kuliah untuk masuk ke daftar materi jobsheet.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-courses",
      pageName: "Halaman Daftar Mata Kuliah Mahasiswa (/mata-kuliah)",
      title: "2. Daftar Mata Kuliah Praktikum",
      icon: BookOpen,
      description: "Melihat seluruh kelas dan mata kuliah yang Anda ikuti pada semester berjalan.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini memuat daftar mata kuliah praktikum tempat Anda terdaftar sebagai peserta kelas:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kartu Mata Kuliah:</strong> Menampilkan kode mata kuliah, nama mata kuliah, dosen pengampu, dan kelas praktikum.
            </li>
            <li>
              <strong>Buka Materi:</strong> Klik tombol <strong>Lihat Detail / Buka Jobsheet</strong> untuk masuk ke daftar modul praktikum.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-course-detail",
      pageName: "Halaman Detail Mata Kuliah Mahasiswa (/mata-kuliah/:courseId)",
      title: "3. Daftar Modul Jobsheet Mata Kuliah",
      icon: Layers,
      description: "Daftar modul jobsheet yang diterbitkan dosen beserta status penyelesaian.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini menampilkan seluruh urutan bab modul jobsheet yang rilis untuk kelas Anda:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Status Penyelesaian:</strong> Indikator badge <em>Selesai</em> (telah dikumpulkan &amp; dinilai), <em>Sedang Dikerjakan</em>, <em>Perlu Revisi</em>, atau <em>Belum Dikerjakan</em>.
            </li>
            <li>
              <strong>Tenggat Waktu (Deadline):</strong> Informasi tanggal dan jam batas akhir pengumpulan tugas reguler maupun remedial.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-jobsheet-overview",
      pageName: "Halaman Overview Jobsheet (/mata-kuliah/:courseId/jobsheets/:jobsheetId)",
      title: "4. Informasi & Riwayat Overview Jobsheet",
      icon: FileText,
      description: "Rincian instruksi jobsheet, riwayat pengumpulan sebelumnya (reguler & remedial), dan tombol pengerjaan.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Sebelum mulai mengoding di editor, halaman ini memberikan gambaran lengkap mengenai modul:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Tujuan &amp; Deskripsi Praktikum:</strong> Capaian pembelajaran yang akan dipelajari pada bab ini.
            </li>
            <li>
              <strong>Tabel Riwayat Pengerjaan:</strong> Menampilkan daftar seluruh attempt pengerjaan (<em>Pengerjaan Reguler</em>, <em>Remedial 1</em>, dll.), status pengumpulan, nilai yang diperoleh, serta tombol <strong>Lihat Review</strong> untuk membuka rincian evaluasi.
            </li>
            <li>
              <strong>Tombol Akses Workspace:</strong> Klik <strong>Mulai Pengerjaan / Lanjutkan Workspace / Kerjakan Remedial</strong> untuk membuka IDE online.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-workspace",
      pageName: "Halaman Online IDE Workspace (/work)",
      title: "5. Lembar Kerja Kode Online (IDE Workspace)",
      icon: Code,
      description: "Editor kode online, terminal runner, auto-save, diskusi dosen, dan tombol submit.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman Workspace ini merupakan tempat utama Anda mengetik kode dan menguji program:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Multi-Tab Materi:</strong> Beralih antara tab <em>Teori</em> (membaca konsep), <em>Percobaan</em> (mengikuti langkah kode &amp; analisis), dan <em>Latihan Kode</em> (menyelesaikan soal mandiri).
            </li>
            <li>
              <strong>Monaco Code Editor:</strong> Editor kode modern pendukung sintaks Java &amp; Python dengan penomoran baris dan autocomplete.
            </li>
            <li>
              <strong>Uji Eksekusi (Run Code):</strong> Klik tombol <strong>Run Code</strong> untuk menjalankan program. Hasil keluaran akan tampil di panel Terminal Output.
            </li>
            <li>
              <strong>Fitur Auto-Save Draft:</strong> Kode Anda tersimpan secara otomatis secara berkala agar draf pengerjaan tidak hilang.
            </li>
            <li>
              <strong>Diskusi Dosen (Live Chat):</strong> Klik tombol <strong>Diskusi Dosen</strong> di header untuk bertanya atau berkonsultasi langsung dengan dosen pengampu.
            </li>
            <li>
              <strong>Pengumpulan (Submit Jobsheet):</strong> Klik tombol <strong>Kumpulkan Jobsheet</strong> pada tab Tugas untuk mengumpulkan. Setelah konfirmasi modal, Anda akan diarahkan kembali ke Halaman Detail Jobsheet.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-review-detail",
      pageName: "Halaman Detail Review Mahasiswa (/review)",
      title: "6. Hasil Evaluasi & Detail Review Mahasiswa",
      icon: Eye,
      description: "Melihat rincian nilai per bagian, rekomendasi AI, dan umpan balik dosen dari pengerjaan reguler maupun remedial.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini menampilkan rincian penilaian hasil pengerjaan Anda setelah diperiksa oleh dosen atau AI Evaluator:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kartu Informasi &amp; Nilai Akhir:</strong> Menampilkan identitas mahasiswa, materi jobsheet, jenis pengerjaan (<em>Reguler / Remedial</em>), status review, dan nilai akhir yang diperoleh.
            </li>
            <li>
              <strong>Rekomendasi AI &amp; Penilaian Bagian (Kiri):</strong> Menampilkan skor rekomendasi AI serta umpan balik ringkasan per bagian Percobaan dan Latihan.
            </li>
            <li>
              <strong>Komentar Kode (Kanan):</strong> Menampilkan catatan umpan balik yang dituliskan dosen pada baris kode tertentu.
            </li>
            <li>
              <strong>Catatan Umpan Balik Dosen:</strong> Rincian feedback keseluruhan dari dosen pengampu praktikum.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "mhs-settings",
      pageName: "Halaman Pengaturan Profil & Keamanan (/settings)",
      title: "7. Pengaturan Akun & Keamanan OTP",
      icon: Settings,
      description: "Manajemen profil mahasiswa, verifikasi OTP ubah kata sandi, dan ubah email.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Mengelola data akun dan keamanan login Mahasiswa:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Ubah Password via OTP:</strong> Minta kode OTP 6-digit ke email terdaftar untuk mengubah kata sandi akun.
            </li>
            <li>
              <strong>Ubah Email via OTP:</strong> Verifikasi perubahan alamat email utama menggunakan kode OTP 6-digit.
            </li>
          </ul>
        </div>
      ),
    },
  ]

  // ----------------------------------------------------------------------
  // PANDUAN ADMINISTRATOR (Page-by-Page)
  // ----------------------------------------------------------------------
  const adminTopics: Topic[] = [
    {
      id: "admin-dashboard",
      pageName: "Halaman Dashboard Admin (/admin/dashboard)",
      title: "1. Dashboard & Statistik Sistem Admin",
      icon: LayoutDashboard,
      description: "Ringkasan total akun pengguna, mata kuliah, dan status operasional sistem.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Dashboard Admin menyajikan gambaran statistik platform secara menyeluruh:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Metrik Pengguna:</strong> Menampilkan total jumlah Mahasiswa, Dosen, dan Kelas Praktikum yang terdaftar dalam sistem.
            </li>
            <li>
              <strong>Navigasi Menu Utama:</strong> Akses ke Kelola Pengguna, Data Akademik, Kurikulum, dan Pengaturan Sistem melalui Sidebar Admin.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "admin-users",
      pageName: "Halaman Kelola Pengguna (/users/students & /users/lecturers)",
      title: "2. Manajemen Akun Mahasiswa & Dosen",
      icon: Users,
      description: "Penambahan akun baru, pencarian NIP/NIM, edit profil, reset password, dan status akun.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini digunakan Admin untuk mengelola seluruh kredensial akun pengguna:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Tambah Pengguna Baru:</strong> Membuat akun Mahasiswa (dengan NIM, Angkatan, Prodi) atau Dosen (dengan NIP, Email Institusi).
            </li>
            <li>
              <strong>Pencarian &amp; Filter:</strong> Mencari akun secara instan berdasarkan nama, NIM/NIP, atau Program Studi.
            </li>
            <li>
              <strong>Edit &amp; Reset Password:</strong> Memperbarui data pengguna atau melakukan reset kata sandi apabila pengguna lupa password.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "admin-academic",
      pageName: "Halaman Data Akademik & Master Data (/admin/academic/*)",
      title: "3. Pengelolaan Data Akademik & Master Kurikulum",
      icon: ShieldCheck,
      description: "Pengaturan Jurusan, Program Studi, Tahun Akademik/Semester, dan Master Mata Kuliah.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman Data Akademik mengatur fondasi struktur institusi kampus:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Tahun Semester / Periode Akademik:</strong> Menentukan periode akademik aktif (misal <em>2027/2028 Ganjil</em>) dan mengaktifkan semester berjalan.
            </li>
            <li>
              <strong>Jurusan &amp; Prodi:</strong> Mengelola struktur organisasi akademik departemen dan program studi.
            </li>
            <li>
              <strong>Master Mata Kuliah:</strong> Menambahkan mata kuliah acuan kurikulum beserta kode mata kuliah, bobot SKS, dan deskripsi.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "admin-classes",
      pageName: "Halaman Kelas Praktikum Admin (/admin/academic/kelas-praktikum)",
      title: "4. Pembentukan Kelas Praktikum & Enrollment Mahasiswa",
      icon: UserCheck,
      description: "Membuat kelas praktikum semester, menunjuk dosen pengampu, dan memplot mahasiswa.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Halaman ini menghubungkan Mata Kuliah Master, Dosen Pengampu, dan Mahasiswa ke dalam Kelas Semester:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Buat Kelas Praktikum:</strong> Menentukan nama kelas (misal: <em>3A</em>), memilih mata kuliah, dan menunjuk dosen pengampu.
            </li>
            <li>
              <strong>Plotting / Enrollment Mahasiswa:</strong> Mengatur daftar mahasiswa yang terdaftar di kelas praktikum tersebut secara massal atau individu.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "admin-settings",
      pageName: "Halaman Pengaturan Profil Admin (/settings)",
      title: "5. Pengaturan Akun & Keamanan OTP Admin",
      icon: Settings,
      description: "Manajemen profil admin, verifikasi OTP ubah kata sandi, dan ubah email.",
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Mengelola akun Administrator:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Ubah Password via OTP:</strong> Minta kode OTP 6-digit ke email terdaftar untuk mengubah kata sandi akun.
            </li>
            <li>
              <strong>Ubah Email via OTP:</strong> Verifikasi perubahan alamat email utama menggunakan kode OTP 6-digit.
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
      subtitle: "Panduan pengisian & operasional platform praktikum per halaman khusus Dosen.",
      icon: Users,
    },
    mahasiswa: {
      roleName: "Mahasiswa",
      subtitle: "Panduan alur penggunaan fitur platform praktikum per halaman khusus Mahasiswa.",
      icon: BookOpen,
    },
    admin: {
      roleName: "Administrator",
      subtitle: "Panduan pengelolaan data master, akun, dan sistem per halaman khusus Administrator.",
      icon: ShieldCheck,
    },
  }

  const currentRoleInfo = roleLabelMap[activeRoleTab]
  const currentTopics = topicsMap[activeRoleTab].filter(
    (item) =>
      !searchTerm.trim() ||
      item.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              Dokumentasi &amp; Panduan Penggunaan Per Halaman
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
              Panduan Halaman {currentRoleInfo.roleName}
            </h1>
            <p className="mt-0.5 text-xs text-blue-200">
              {currentRoleInfo.subtitle}
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama halaman / topik panduan..."
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
          <p className="mt-3 text-sm font-bold text-gray-700">Tidak ada topik halaman yang cocok dengan kata kunci pencarian.</p>
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
                    <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100 mb-1">
                      {topic.pageName}
                    </span>
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
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
        <Breadcrumbs items={[{ label: "Panduan Penggunaan" }]} className="mb-3" />
        {pageContent}
      </main>
    </div>
  )
}
