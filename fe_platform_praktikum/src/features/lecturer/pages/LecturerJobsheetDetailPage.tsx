import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerPanel, LecturerTable, NativeSelect, PageHeader, SearchBox, TabButton } from "../components/LecturerUI"
import { getCourse, getJobsheet, studentProgress } from "../data/dummy"

type DetailTab = "detail" | "students" | "settings"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "detail", label: "Detail Jobsheet" },
  { id: "students", label: "Mahasiswa" },
  { id: "settings", label: "Pengaturan" },
]

export default function LecturerJobsheetDetailPage() {
  const { jobsheetId = "js-1" } = useParams()
  const [activeTab, setActiveTab] = useState<DetailTab>("detail")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("all")
  const navigate = useNavigate()
  const jobsheet = getJobsheet(jobsheetId)
  const course = getCourse(jobsheet.courseId)

  const filteredStudents = studentProgress.filter((student) => {
    const matchKeyword = !keyword || [student.name, student.nim].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))
    const matchStatus = status === "all" || student.status === status
    return matchKeyword && matchStatus
  })

  return (
    <LecturerLayout>
      <PageHeader
        title={`Detail Jobsheet ${jobsheet.number}`}
        subtitle={`${course.name} - Status: ${jobsheet.status}`}
      />

      <TabButton tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <LecturerPanel className="rounded-t-none p-5">
        {activeTab === "detail" && (
          <div className="space-y-5">
            <LecturerPanel className="p-5">
              <h2 className="text-lg font-semibold">Informasi Umum</h2>
              <p className="mt-3 text-sm text-gray-700">Judul Jobsheet: {jobsheet.title}</p>
              <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline}</p>
            </LecturerPanel>
            <LecturerPanel className="p-5">
              <h2 className="text-lg font-semibold">Percobaan Praktikum</h2>
              <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
                <p className="font-semibold">Percobaan 1</p>
                <p className="mt-2">Jalankan kode awal, ubah nilai, dan amati output program.</p>
              </div>
            </LecturerPanel>
            <LecturerButton onClick={() => navigate(`/courses/${course.id}/jobsheets/${jobsheet.id}/edit`)}>
              Edit Jobsheet
            </LecturerButton>
          </div>
        )}

        {activeTab === "students" && (
          <div>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <NativeSelect value={status} onChange={setStatus} label="Status">
                <option value="all">Semua Status</option>
                <option value="Terkumpul">Terkumpul</option>
                <option value="Dinilai">Dinilai</option>
                <option value="Revisi">Revisi</option>
              </NativeSelect>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
            </div>
            <LecturerTable headers={["NIM", "Nama", "Status", "Nilai AI", "Nilai Akhir", "Aksi"]}>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-mono">{student.nim}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.status}</td>
                  <td className="px-4 py-3 text-center">{student.aiScore ?? "-"}</td>
                  <td className="px-4 py-3 text-center">{student.finalScore ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" className="font-semibold text-blue-700 hover:text-blue-900" onClick={() => navigate(`/reviews/${student.id}`)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </LecturerTable>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <LecturerPanel className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Status Jobsheet</h2>
              <p className="text-sm text-gray-700">Status saat ini: {jobsheet.status}</p>
              <LecturerButton className="mt-4">{jobsheet.status === "Published" ? "Nonaktifkan" : "Publish"}</LecturerButton>
            </LecturerPanel>
            <LecturerPanel className="p-5">
              <h2 className="mb-4 text-lg font-semibold">Bobot Penilaian AI</h2>
              <div className="space-y-3 text-sm">
                {["Kesesuaian Instruksi", "Kualitas Kode", "Analisa & Kesimpulan"].map((item) => (
                  <label key={item} className="flex max-w-md items-center justify-between gap-4">
                    <span>{item}</span>
                    <input className="h-9 w-20 rounded-md border border-gray-300 px-3" defaultValue="30%" />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <LecturerButton variant="secondary">Batal</LecturerButton>
                <LecturerButton>Simpan</LecturerButton>
              </div>
            </LecturerPanel>
          </div>
        )}
      </LecturerPanel>
    </LecturerLayout>
  )
}
