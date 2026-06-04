import { ArrowLeft, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminButton,
  AdminModal,
  AdminPanel,
  AdminSearchInput,
  AdminTable,
  AdminTabs,
  EmptyState,
  FieldRow,
  inputClass,
} from "../components/AdminUI"
import {
  academicClasses,
  adminLecturers,
  adminStudents,
  availableStudents,
  classJobsheets,
} from "../data/adminData"

type DetailTab = "students" | "jobsheets" | "settings"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "students", label: "Mahasiswa" },
  { id: "jobsheets", label: "Jobsheet" },
  { id: "settings", label: "Pengaturan" },
]

export default function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const selectedClass = academicClasses.find((item) => item.id === id) ?? academicClasses[0]
  const [activeTab, setActiveTab] = useState<DetailTab>("students")
  const [assignOpen, setAssignOpen] = useState(false)
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  const studentCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return availableStudents.filter((student) =>
      !normalized ||
      [student.nim, student.fullname].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [query])

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={() => navigate("/admin/academic?tab=classes")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Kelas {selectedClass.name} - {selectedClass.courseName}
          </h1>
          <p className="mt-3 text-sm text-gray-600">Semester Akademik: {selectedClass.semesterYear}</p>
          <p className="text-sm text-gray-600">Semester Mahasiswa: {selectedClass.studentSemester}</p>
        </div>
        <span className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-100 px-5 text-sm font-semibold text-blue-800">
          {selectedClass.status}
        </span>
      </div>

      <div className="mx-auto max-w-6xl">
        <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <AdminPanel className="rounded-t-none p-5">
          {activeTab === "students" && (
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Mengelola daftar mahasiswa yang terdaftar pada kelas praktikum.
                  </p>
                  <h2 className="mt-5 text-lg font-semibold text-gray-900">Daftar Mahasiswa</h2>
                  <p className="text-sm text-gray-600">Mahasiswa yang terdaftar pada kelas ini.</p>
                </div>
                <AdminButton onClick={() => setAssignOpen(true)}>
                  <Plus size={16} />
                  Assign Mahasiswa
                </AdminButton>
              </div>

              {adminStudents.length ? (
                <AdminTable headers={["NIM", "Nama", "Semester", "Status"]}>
                  {adminStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-mono">{student.nim}</td>
                      <td className="px-4 py-3">{student.fullname}</td>
                      <td className="px-4 py-3">{student.semester}</td>
                      <td className="px-4 py-3">{student.status}</td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState
                  title="Belum ada mahasiswa di kelas ini"
                  action={<AdminButton onClick={() => setAssignOpen(true)}><Plus size={16} />Assign Mahasiswa</AdminButton>}
                />
              )}
            </div>
          )}

          {activeTab === "jobsheets" && (
            <div>
              <p className="mb-5 border-b border-gray-200 pb-4 text-sm text-gray-600">
                Menampilkan daftar jobsheet praktikum yang digunakan pada kelas ini.
              </p>
              <h2 className="text-lg font-semibold text-gray-900">Jobsheet Praktikum</h2>
              <p className="mb-5 text-sm text-gray-600">Daftar jobsheet yang digunakan pada kelas ini.</p>

              {classJobsheets.length ? (
                <AdminTable headers={["Judul Jobsheet", "Deadline", "Status", "Aksi"]}>
                  {classJobsheets.map((jobsheet) => (
                    <tr key={jobsheet.id}>
                      <td className="px-4 py-3">{jobsheet.title}</td>
                      <td className="px-4 py-3">{jobsheet.deadline}</td>
                      <td className="px-4 py-3">{jobsheet.status}</td>
                      <td className="px-4 py-3">
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => navigate(`/admin/jobsheets/${jobsheet.id}/preview`)}
                        >
                          Preview
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada jobsheet yang digunakan pada kelas ini" />
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <section className="border-b border-gray-200 pb-5">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Kelas</h2>
                <dl className="mt-4 grid gap-2 text-sm md:grid-cols-[180px_1fr]">
                  <dt className="text-gray-600">Mata Kuliah</dt><dd className="font-medium">{selectedClass.courseName}</dd>
                  <dt className="text-gray-600">Semester Akademik</dt><dd className="font-medium">{selectedClass.semesterYear}</dd>
                  <dt className="text-gray-600">Semester Mahasiswa</dt><dd className="font-medium">{selectedClass.studentSemester}</dd>
                  <dt className="text-gray-600">Nama Kelas</dt><dd className="font-medium">{selectedClass.name}</dd>
                </dl>
              </section>
              <section className="border-b border-gray-200 py-5">
                <h2 className="text-lg font-semibold text-gray-900">Dosen Pengampu</h2>
                <FieldRow label="Pilih Dosen">
                  <select className={`${inputClass} max-w-sm`} defaultValue={selectedClass.lecturer}>
                    {adminLecturers.map((lecturer) => <option key={lecturer.id}>{lecturer.fullname}</option>)}
                  </select>
                </FieldRow>
              </section>
              <section className="py-5">
                <h2 className="text-lg font-semibold text-gray-900">Status Kelas</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {["Draft", "Aktif", "Arsip"].map((status) => (
                    <label key={status} className="flex items-center gap-2">
                      <input type="radio" name="class-status" defaultChecked={selectedClass.status === status} />
                      {status}
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <AdminButton variant="secondary">Batal</AdminButton>
                  <AdminButton>Simpan Perubahan</AdminButton>
                </div>
              </section>
            </div>
          )}
        </AdminPanel>
      </div>

      {assignOpen && (
        <AdminModal
          title="Assign Mahasiswa ke Kelas"
          onClose={() => setAssignOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setAssignOpen(false)}>Batal</AdminButton>
              <AdminButton onClick={() => setAssignOpen(false)}>Assign</AdminButton>
            </>
          }
        >
          <div className="space-y-4">
            <FieldRow label="Semester Mahasiswa">
              <select className={inputClass} defaultValue="3">
                <option>1</option>
                <option>3</option>
                <option>5</option>
              </select>
            </FieldRow>
            <FieldRow label="Cari Mahasiswa">
              <AdminSearchInput value={query} onChange={setQuery} placeholder="NIM / Nama" />
            </FieldRow>
            <div className="space-y-3">
              {studentCandidates.map((student) => (
                <label key={student.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>{student.nim} - {student.fullname}</span>
                </label>
              ))}
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  )
}
