import { useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerModal, LecturerPanel, FieldRow, PageHeader, inputClass } from "../components/LecturerUI"
import { getCourse, getJobsheet } from "../data/dummy"

export default function LecturerJobsheetEditorPage() {
  const { courseId = "pbo", jobsheetId } = useParams()
  const [publishOpen, setPublishOpen] = useState(false)
  const navigate = useNavigate()
  const course = getCourse(courseId)
  const jobsheet = jobsheetId ? getJobsheet(jobsheetId) : null
  const isCreate = !jobsheetId

  return (
    <LecturerLayout>
      <PageHeader
        title={isCreate ? "Buat Jobsheet Praktikum" : `Edit Jobsheet ${jobsheet?.number}`}
        subtitle={`Mata Kuliah: ${course.name}`}
        right={<span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Status: {jobsheet?.status ?? "Draft"}</span>}
      />

      <div className="mx-auto max-w-4xl space-y-5">
        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Informasi Umum</h2>
          <div className="space-y-4">
            <FieldRow label="Judul Jobsheet">
              <input className={inputClass} defaultValue={jobsheet?.title ?? ""} placeholder="Masukkan judul jobsheet" />
            </FieldRow>
            <FieldRow label="Deskripsi Singkat">
              <input className={inputClass} placeholder="Masukkan deskripsi singkat" />
            </FieldRow>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Tujuan Praktikum</h2>
          <textarea className="min-h-32 w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Dasar Teori</h2>
          <div className="space-y-4">
            <FieldRow label="Judul">
              <input className={inputClass} placeholder="Subtopik 1" />
            </FieldRow>
            <FieldRow label="Materi">
              <textarea className="min-h-28 rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </FieldRow>
            <LecturerButton variant="secondary">
              <Plus size={16} />
              Tambah Subtopik
            </LecturerButton>
          </div>
        </LecturerPanel>

        {["Percobaan Praktikum", "Latihan Praktikum"].map((section) => (
          <LecturerPanel key={section} className="p-5">
            <h2 className="mb-4 text-lg font-semibold">{section}</h2>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="mb-3 font-semibold">{section.startsWith("Percobaan") ? "Percobaan 1" : "Latihan 1"}</h3>
              <div className="space-y-3">
                <input className={inputClass} defaultValue="Tipe Data Integer" />
                <textarea
                  className="min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm"
                  defaultValue={"1. Jalankan kode awal dan amati output\n2. Ubah nilaiA menjadi -129\n3. Ubah nilaiB menjadi 3000000000"}
                />
                <textarea
                  className="min-h-28 w-full rounded-md border border-gray-300 p-3 font-mono text-xs"
                  defaultValue={"public class HaloDunia {\n  public static void main(String[] args) {\n    System.out.println(\"Halo, Dunia!\");\n  }\n}"}
                />
              </div>
            </div>
          </LecturerPanel>
        ))}

        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Tugas Praktikum</h2>
          <textarea
            className="min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm"
            defaultValue="Buatlah laporan praktikum untuk percobaan dan latihan yang telah ditentukan, sesuai dengan format laporan yang berlaku."
          />
        </LecturerPanel>

        <div className="flex justify-end gap-3">
          <LecturerButton variant="secondary" onClick={() => navigate(`/courses/${course.id}/jobsheets`)}>
            Simpan Draft
          </LecturerButton>
          <LecturerButton onClick={() => setPublishOpen(true)}>
            Simpan & Publikasikan
          </LecturerButton>
        </div>
      </div>

      {publishOpen && (
        <LecturerModal
          title="Publikasikan Jobsheet"
          onClose={() => setPublishOpen(false)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setPublishOpen(false)}>Batal</LecturerButton>
              <LecturerButton onClick={() => navigate(`/courses/${course.id}/jobsheets`)}>Publikasikan</LecturerButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="font-semibold">Kelas</p>
              {course.classes.map((item, index) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked={index !== 1} />
                  Kelas {item.name}
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-semibold">Deadline Pengumpulan</p>
              {course.classes.map((item) => (
                <input key={item.id} type="date" defaultValue="2026-06-22" className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
              ))}
            </div>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
