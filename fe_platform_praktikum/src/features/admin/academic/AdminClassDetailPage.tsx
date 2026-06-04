import { ArrowLeft, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminActionCell,
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
  assignAdminStudentsToClass,
  getAdminClassById,
  getAdminStudentCandidates,
  getAdminUsers,
} from "../../../services/admin/service"
import type {
  AdminClassDetail,
  AdminLecturer,
  AdminStudent,
} from "../../../services/admin/types"
import { getStudentSemesterOptions } from "./semesterOptions"

type DetailTab = "students" | "jobsheets" | "settings"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "students", label: "Mahasiswa" },
  { id: "jobsheets", label: "Jobsheet" },
  { id: "settings", label: "Pengaturan" },
]

export default function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [classDetail, setClassDetail] = useState<AdminClassDetail | null>(null)
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>("students")
  const [assignOpen, setAssignOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [studentSemester, setStudentSemester] = useState("all")
  const [studentCandidates, setStudentCandidates] = useState<AdminStudent[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const fetchClass = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError("")

    try {
      const [detail, lecturerData] = await Promise.all([
        getAdminClassById(id),
        getAdminUsers("lecturers"),
      ])

      setClassDetail(detail)
      setLecturers(lecturerData as AdminLecturer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail kelas")
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchCandidates = useCallback(async () => {
    if (!id || !assignOpen) return

    try {
      const data = await getAdminStudentCandidates(id, {
        keyword: query,
        semester: studentSemester,
      })
      setStudentCandidates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kandidat mahasiswa")
    }
  }, [assignOpen, id, query, studentSemester])

  useEffect(() => {
    fetchClass()
  }, [fetchClass])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  const selectedClass = classDetail
  const candidates = useMemo(() => studentCandidates, [studentCandidates])
  const studentSemesterOptions = useMemo(
    () => getStudentSemesterOptions(selectedClass?.semesterYear),
    [selectedClass?.semesterYear],
  )

  useEffect(() => {
    if (studentSemester !== "all" && !studentSemesterOptions.includes(Number(studentSemester))) {
      setStudentSemester("all")
    }
  }, [studentSemester, studentSemesterOptions])

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    )
  }

  const handleAssign = async () => {
    if (!id || !selectedStudentIds.length) {
      setAssignOpen(false)
      return
    }

    try {
      await assignAdminStudentsToClass(id, selectedStudentIds)
      setAssignOpen(false)
      setSelectedStudentIds([])
      fetchClass()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal assign mahasiswa")
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <EmptyState title="Memuat detail kelas..." />
      </AdminLayout>
    )
  }

  if (!selectedClass) {
    return (
      <AdminLayout>
        <EmptyState title={error || "Kelas tidak ditemukan"} />
      </AdminLayout>
    )
  }

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

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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

              {selectedClass.students.length ? (
                <AdminTable headers={["NIM", "Nama", "Semester", "Status"]}>
                  {selectedClass.students.map((student) => (
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

              {selectedClass.jobsheets.length ? (
                <AdminTable headers={["Judul Jobsheet", "Deadline", "Status", "Aksi"]}>
                  {selectedClass.jobsheets.map((jobsheet) => (
                    <tr key={jobsheet.classJobsheetId}>
                      <td className="px-4 py-3">{jobsheet.title}</td>
                      <td className="px-4 py-3">{jobsheet.deadline}</td>
                      <td className="px-4 py-3">{jobsheet.status}</td>
                      <AdminActionCell>
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => navigate(`/admin/jobsheets/${jobsheet.id}/preview`)}
                        >
                          Preview
                        </AdminButton>
                      </AdminActionCell>
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
                  <select
                    className={`${inputClass} max-w-sm`}
                    value={selectedClass.lecturerId}
                    onChange={() => undefined}
                  >
                    {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
                  </select>
                </FieldRow>
              </section>
              <section className="py-5">
                <h2 className="text-lg font-semibold text-gray-900">Status Kelas</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {["Draft", "Aktif", "Arsip"].map((status) => (
                    <label key={status} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="class-status"
                        checked={selectedClass.status === status}
                        onChange={() => undefined}
                      />
                      {status}
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <AdminButton variant="secondary" disabled>Batal</AdminButton>
                  <AdminButton disabled>Simpan Perubahan</AdminButton>
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
              <AdminButton onClick={handleAssign}>Assign</AdminButton>
            </>
          }
        >
          <div className="space-y-4">
            <FieldRow label="Semester Mahasiswa">
              <select className={inputClass} value={studentSemester} onChange={(event) => setStudentSemester(event.target.value)}>
                <option value="all">Semua Semester</option>
                {studentSemesterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Cari Mahasiswa">
              <AdminSearchInput value={query} onChange={setQuery} placeholder="NIM / Nama" />
            </FieldRow>
            <div className="space-y-3">
              {candidates.length ? candidates.map((student) => (
                <label key={student.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>{student.nim} - {student.fullname}</span>
                </label>
              )) : (
                <p className="text-sm text-gray-500">Tidak ada kandidat mahasiswa.</p>
              )}
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  )
}
