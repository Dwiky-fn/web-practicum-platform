import { ArrowLeft, Copy, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { AdminButton, AdminPanel, inputClass } from "../components/AdminUI"

function PreviewSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <AdminPanel className="p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </AdminPanel>
  )
}

export default function AdminJobsheetPreviewPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={18} />
          Kembali
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Preview Jobsheet Praktikum</h1>
            <p className="mt-1 text-sm text-gray-600">Mata Kuliah: Pemrograman Berorientasi Objek</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Status: {id === "job-3" ? "DRAFT" : "AKTIF"}
          </span>
        </div>

        <div className="space-y-6">
          <PreviewSection title="Informasi Umum">
            <label className="block text-sm font-medium">
              Judul Jobsheet *
              <input className={`${inputClass} mt-2 w-full`} placeholder="Masukkan judul jobsheet" readOnly />
            </label>
            <label className="block text-sm font-medium">
              Deskripsi Singkat
              <input className={`${inputClass} mt-2 w-full`} placeholder="Masukkan deskripsi singkat" readOnly />
            </label>
          </PreviewSection>

          <PreviewSection title="Tujuan Praktikum *">
            <textarea
              className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              placeholder="Masukkan tujuan praktikum"
              readOnly
            />
          </PreviewSection>

          <PreviewSection title="Dasar Teori *">
            <label className="block text-sm font-medium">
              Subtopik 1
              <input className={`${inputClass} mt-2 w-full`} placeholder="Masukkan judul subtopik" readOnly />
            </label>
            <textarea
              className="min-h-32 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              placeholder="Masukkan materi dasar teori"
              readOnly
            />
          </PreviewSection>

          <PreviewSection title="Percobaan Praktikum">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-950">Percobaan 1</h3>
              <label className="mt-3 block text-sm font-medium">
                Judul *
                <input className={`${inputClass} mt-2 w-full`} placeholder="Masukkan judul percobaan" readOnly />
              </label>
              <p className="mt-4 text-sm font-medium">Instruksi Percobaan</p>
              <ol className="ml-5 mt-2 list-decimal text-sm text-gray-700">
                <li>Jalankan kode awal dan amati output.</li>
                <li>Ubah nilai A menjadi -129.</li>
                <li>Ubah nilai B menjadi 3000000000.</li>
              </ol>
              <pre className="mt-4 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
{`public class HaloDunia {
  public static void main(String[] args) {
    System.out.println("Halo, Dunia!");
  }
}`}
              </pre>
              <div className="mt-3 flex justify-end gap-2">
                <AdminButton variant="secondary" className="h-8 px-3"><Copy size={14} />Salin</AdminButton>
                <AdminButton variant="secondary" className="h-8 px-3"><Trash2 size={14} />Hapus</AdminButton>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection title="Tugas Praktikum">
            <div className="space-y-3 text-sm">
              <p className="font-medium">Konten Laporan</p>
              <label className="flex items-center gap-2"><input type="checkbox" /> Percobaan 1 - Pengenalan OOP</label>
              <label className="flex items-center gap-2"><input type="checkbox" /> Percobaan 2 - Kelas dan Objek</label>
              <label className="block font-medium">
                Instruksi *
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  placeholder="Masukkan instruksi laporan"
                  readOnly
                />
              </label>
            </div>
          </PreviewSection>
        </div>
      </main>
    </div>
  )
}
