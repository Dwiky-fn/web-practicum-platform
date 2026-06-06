import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  ProgressBar,
  SearchBox,
  StatCard,
  TabButton,
} from "../components/LecturerUI"
import { getClass, getCourse, lecturerJobsheets, studentProgress } from "../data/dummy"

type ClassTab = "summary" | "modules" | "students" | "evaluation"

const tabs: Array<{ id: ClassTab; label: string }> = [
  { id: "summary", label: "Ringkasan Kelas" },
  { id: "modules", label: "Modul Praktikum" },
  { id: "students", label: "Mahasiswa" },
  { id: "evaluation", label: "Evaluasi & Nilai" },
]

export default function LecturerClassDetailPage() {
  const { courseId = "pbo", classId = "pbo-a" } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<ClassTab>((searchParams.get("tab") as ClassTab) || "summary")
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [jobsheetFilter, setJobsheetFilter] = useState("all")
  const navigate = useNavigate()
  const course = getCourse(courseId)
  const selectedClass = getClass(courseId, classId)
  const jobsheets = lecturerJobsheets.filter((jobsheet) => jobsheet.courseId === course.id)

  const filteredStudents = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return studentProgress.filter((student) => {
      const matchKeyword = !normalized || [student.nim, student.name].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = statusFilter === "all" || student.status === statusFilter
      const matchJobsheet = jobsheetFilter === "all" || String(student.jobsheet) === jobsheetFilter
      return matchKeyword && matchStatus && matchJobsheet
    })
  }, [jobsheetFilter, keyword, statusFilter])

  return (
    <LecturerLayout>
      <PageHeader
        title={course.name}
        subtitle={`Kelas ${selectedClass.name} - Semester ${course.semester} - ${course.period}`}
      />

      <TabButton tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <LecturerPanel className="rounded-t-none p-5">
        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total Mahasiswa" value={selectedClass.studentCount} />
              <StatCard label="Jobsheet Aktif" value={jobsheets.filter((item) => item.status === "Published").length} />
              <StatCard label="Belum Direview" value={8} caption="Laporan" />
            </div>
            <LecturerPanel className="p-5">
              <h2 className="mb-4 text-lg font-semibold">Progress Evaluasi Laporan</h2>
              <ProgressBar value={70} />
            </LecturerPanel>
            <LecturerPanel className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Aktivitas Mahasiswa Terbaru</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>Andi mengumpulkan Jobsheet 3</li>
                <li>AI selesai mengevaluasi 5 laporan</li>
                <li>2 laporan terdeteksi kemiripan tinggi</li>
              </ul>
            </LecturerPanel>
          </div>
        )}

        {activeTab === "modules" && (
          <div>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <LecturerButton onClick={() => navigate(`/courses/${course.id}/jobsheets/create`)}>
                <Plus size={16} />
                Tambah Jobsheet
              </LecturerButton>
              <NativeSelect value={statusFilter} onChange={setStatusFilter} label="Status">
                <option value="all">Semua Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Nonaktif">Nonaktif</option>
              </NativeSelect>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {jobsheets
                .filter((jobsheet) => statusFilter === "all" || jobsheet.status === statusFilter)
                .filter((jobsheet) => jobsheet.title.toLowerCase().includes(keyword.toLowerCase()))
                .map((jobsheet) => (
                  <LecturerPanel key={jobsheet.id} className="p-5">
                    <h2 className="text-lg font-semibold">Jobsheet {jobsheet.number} - {jobsheet.title}</h2>
                    <p className="mt-1 text-sm text-gray-600">Status: {jobsheet.status}</p>
                    <p className="mt-4 text-sm text-gray-700">Submit: {jobsheet.submitted}/{jobsheet.total} Mahasiswa</p>
                    <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <LecturerButton variant="secondary" onClick={() => navigate(`/jobsheets/${jobsheet.id}`)}>Lihat Detail</LecturerButton>
                      <LecturerButton variant="secondary" onClick={() => navigate(`/courses/${course.id}/jobsheets/${jobsheet.id}/edit`)}>Edit</LecturerButton>
                    </div>
                  </LecturerPanel>
                ))}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="Jobsheet">
                <option value="all">Semua Jobsheet</option>
                {jobsheets.map((jobsheet) => (
                  <option key={jobsheet.id} value={jobsheet.number}>Jobsheet {jobsheet.number}</option>
                ))}
              </NativeSelect>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
            </div>
            <LecturerTable headers={["NIM", "Nama", "Laporan", "Aksi"]}>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-mono">{student.nim}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3 text-center">{student.reportCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" className="font-semibold text-blue-700 hover:text-blue-900">
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
            </LecturerTable>
          </div>
        )}

        {activeTab === "evaluation" && (
          <div>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <NativeSelect value={jobsheetFilter} onChange={setJobsheetFilter} label="Jobsheet">
                <option value="all">Semua Jobsheet</option>
                {jobsheets.map((jobsheet) => (
                  <option key={jobsheet.id} value={jobsheet.number}>Jobsheet {jobsheet.number}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={statusFilter} onChange={setStatusFilter} label="Status evaluasi">
                <option value="all">Semua Status</option>
                <option value="Terkumpul">Terkumpul</option>
                <option value="Dinilai">Dinilai</option>
                <option value="Revisi">Revisi</option>
              </NativeSelect>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
            </div>
            <LecturerTable headers={["NIM", "Nama", "Jobsheet", "Nilai AI", "Nilai Akhir", "Aksi"]}>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-mono">{student.nim}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3 text-center">{student.jobsheet}</td>
                  <td className="px-4 py-3 text-center">{student.aiScore ?? "-"}</td>
                  <td className="px-4 py-3 text-center">{student.finalScore ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="font-semibold text-blue-700 hover:text-blue-900"
                      onClick={() => navigate(`/reviews/${student.id}`)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </LecturerTable>
          </div>
        )}
      </LecturerPanel>
    </LecturerLayout>
  )
}
