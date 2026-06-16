import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminActionCell,
  AdminButton,
  AdminConfirmModal,
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
  removeAdminStudentFromClass,
  updateAdminClass,
} from "../../../services/admin/service"
import type {
  AdminClassDetail,
  AdminLecturer,
  AdminStudent,
} from "../../../services/admin/types"
import { getStudentSemesterOptions } from "./semesterOptions"

type DetailTab = "students" | "jobsheets" | "settings"
type EditableClassStatus = "Aktif" | "Nonaktif" | "Arsip"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "students", label: "Mahasiswa" },
  { id: "jobsheets", label: "Jobsheet" },
  { id: "settings", label: "Pengaturan" },
]

function toEditableClassStatus(status: AdminClassDetail["status"]): EditableClassStatus {
  if (status === "Arsip") return "Arsip"
  if (status === "Nonaktif" || status === "Draft" || status === "Selesai") return "Nonaktif"
  return "Aktif"
}

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
  const [classForm, setClassForm] = useState({
    lecturerId: "",
    programmingLanguage: "java" as "java" | "python",
    status: "" as EditableClassStatus | "",
  })
  const [activationWarning, setActivationWarning] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<AdminStudent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  // Multi-select & Long Press state for registered class students
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [longPressActive, setLongPressActive] = useState(false)

  const toggleSelection = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleMouseDown = (studentId: string) => {
    setLongPressActive(false)
    const timer = setTimeout(() => {
      setLongPressActive(true)
      toggleSelection(studentId)
    }, 600)
    setLongPressTimer(timer)
  }

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleMouseUp = (studentId: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
      if (!longPressActive) {
        if (selectedIds.length > 0) {
          toggleSelection(studentId)
        }
      }
    }
  }

  const handleTouchStart = (studentId: string) => {
    handleMouseDown(studentId)
  }

  const handleTouchEnd = (studentId: string) => {
    handleMouseUp(studentId)
  }

  const openAssignModal = () => {
    setQuery("")
    setStudentSemester("all")
    setSelectedStudentIds([])
    setStudentCandidates([])
    setAssignOpen(true)
  }

  const handleBulkRemoveStudent = async () => {
    if (!id || !selectedIds.length) return
    try {
      setDeleting(true)
      setError("")
      await Promise.all(selectedIds.map((studentId) => removeAdminStudentFromClass(id, studentId)))
      setBulkDeleteConfirmOpen(false)
      setSelectedIds([])
      fetchClass()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus mahasiswa")
    } finally {
      setDeleting(false)
    }
  }

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
      setClassForm({
        lecturerId: detail.lecturerId,
        programmingLanguage: detail.programmingLanguage || "java",
        status: toEditableClassStatus(detail.status),
      })
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
      setAssigning(true)
      await assignAdminStudentsToClass(id, selectedStudentIds)
      setAssignOpen(false)
      setSelectedStudentIds([])
      fetchClass()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal assign mahasiswa")
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!id || !studentToDelete) return

    try {
      setDeleting(true)
      setError("")
      await removeAdminStudentFromClass(id, studentToDelete.id)
      setDeleteConfirmOpen(false)
      setStudentToDelete(null)
      fetchClass()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus mahasiswa")
    } finally {
      setDeleting(false)
    }
  }

  const handleClassSettingsSubmit = async () => {
    if (!id || !selectedClass || !classForm.lecturerId || !classForm.status) return

    if (
      classForm.status === "Aktif" &&
      !getStudentSemesterOptions(selectedClass.semesterYear).includes(selectedClass.studentSemester)
    ) {
      setActivationWarning(true)
      return
    }

    try {
      setSaving(true)
      setError("")
      const updated = await updateAdminClass(id, {
        courseId: selectedClass.courseId,
        name: selectedClass.name,
        lecturerId: classForm.lecturerId,
        programmingLanguage: classForm.programmingLanguage,
        status: classForm.status,
      })
      setClassDetail(updated)
      setClassForm({
        lecturerId: updated.lecturerId,
        programmingLanguage: updated.programmingLanguage || "java",
        status: toEditableClassStatus(updated.status),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan kelas")
    } finally {
      setSaving(false)
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
        onClick={() => navigate("/admin/academic/kelas-praktikum")}
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
          <p className="text-sm text-gray-600">Bahasa Pemrograman: {selectedClass.programmingLanguageDisplayName || "Java"}</p>
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
                <AdminButton onClick={openAssignModal}>
                  <Plus size={16} />
                  Assign Mahasiswa
                </AdminButton>
              </div>

              {selectedClass.students.length ? (
                <AdminTable headers={selectedIds.length > 0 ? ["", "NIM", "Nama", "Semester", "Status", "Aksi"] : ["NIM", "Nama", "Semester", "Status", "Aksi"]}>
                  {selectedClass.students.map((student) => (
                    <tr
                      key={student.id}
                      className={`${selectedIds.includes(student.id) ? "bg-blue-50/40" : ""} cursor-default select-none`}
                      onMouseDown={() => handleMouseDown(student.id)}
                      onMouseUp={() => handleMouseUp(student.id)}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => handleTouchStart(student.id)}
                      onTouchEnd={() => handleTouchEnd(student.id)}
                    >
                      {selectedIds.length > 0 && (
                        <td
                          className="px-4 py-3 text-center"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.includes(student.id)}
                            onChange={() => toggleSelection(student.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono">{student.nim}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{student.fullname}</span>
                      </td>
                      <td className="px-4 py-3">{student.semester}</td>
                      <td className="px-4 py-3">{student.status}</td>
                      <AdminActionCell>
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:bg-red-50"
                          onMouseDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            setStudentToDelete(student)
                            setDeleteConfirmOpen(true)
                          }}
                        >
                          Hapus
                        </AdminButton>
                      </AdminActionCell>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState
                  title="Belum ada mahasiswa di kelas ini"
                  action={<AdminButton onClick={openAssignModal}><Plus size={16} />Assign Mahasiswa</AdminButton>}
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
                          onClick={() => navigate(`/jobsheets/${jobsheet.id}/preview?courseId=${selectedClass.courseId}`)}
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
                  <dt className="text-gray-600">Bahasa Pemrograman</dt><dd className="font-medium">{selectedClass.programmingLanguageDisplayName || "Java"}</dd>
                </dl>
              </section>
              <section className="border-b border-gray-200 py-5">
                <h2 className="text-lg font-semibold text-gray-900">Dosen Pengampu</h2>
                <FieldRow label="Pilih Dosen">
                  <select
                    className={`${inputClass} max-w-sm`}
                    value={classForm.lecturerId}
                    onChange={(event) => setClassForm((form) => ({
                      ...form,
                      lecturerId: event.target.value,
                    }))}
                  >
                    {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
                  </select>
                </FieldRow>
              </section>
              <section className="border-b border-gray-200 py-5">
                <h2 className="text-lg font-semibold text-gray-900">Bahasa Pemrograman</h2>
                <FieldRow label="Pilih Bahasa">
                  <select
                    className={`${inputClass} max-w-sm`}
                    value={classForm.programmingLanguage}
                    onChange={(event) => setClassForm((form) => ({
                      ...form,
                      programmingLanguage: event.target.value as "java" | "python",
                    }))}
                  >
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                  </select>
                </FieldRow>
              </section>
              <section className="py-5">
                <h2 className="text-lg font-semibold text-gray-900">Status Kelas</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {(["Nonaktif", "Aktif", "Arsip"] as EditableClassStatus[]).map((status) => (
                    <label key={status} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="class-status"
                        checked={classForm.status === status}
                        onChange={() => setClassForm((form) => ({
                          ...form,
                          status,
                        }))}
                      />
                      {status}
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <AdminButton
                    variant="secondary"
                    disabled={saving}
                    onClick={() => setClassForm({
                      lecturerId: selectedClass.lecturerId,
                      programmingLanguage: selectedClass.programmingLanguage || "java",
                      status: toEditableClassStatus(selectedClass.status),
                    })}
                  >
                    Batal
                  </AdminButton>
                  <AdminButton
                    disabled={saving || !classForm.lecturerId || !classForm.status}
                    onClick={handleClassSettingsSubmit}
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </AdminButton>
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
              <AdminButton onClick={handleAssign} disabled={assigning}>
                {assigning ? "Mengassign..." : "Assign"}
              </AdminButton>
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
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border border-gray-200 rounded-md p-3 bg-gray-50">
              {candidates.length ? candidates.map((student) => (
                <label key={student.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span className="text-gray-700 select-none">{student.nim} - {student.fullname}</span>
                </label>
              )) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  {query || studentSemester !== "all"
                    ? "Tidak ada kandidat yang sesuai filter."
                    : "Tidak ada kandidat mahasiswa yang tersedia."}
                </p>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      {activationWarning && (
        <AdminModal
          title="Kelas Tidak Bisa Diaktifkan"
          onClose={() => setActivationWarning(false)}
          footer={<AdminButton onClick={() => setActivationWarning(false)}>Mengerti</AdminButton>}
        >
          <p className="text-center text-sm text-gray-700">
            Kelas hanya bisa diaktifkan jika semester mahasiswa sesuai dengan semester akademik aktif.
          </p>
        </AdminModal>
      )}

      {deleteConfirmOpen && studentToDelete && (
        <AdminConfirmModal
          title="Hapus Mahasiswa dari Kelas"
          message={`Apakah Anda yakin ingin menghapus ${studentToDelete.fullname} (${studentToDelete.nim}) dari kelas ini?`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          variant="danger"
          loading={deleting}
          onCancel={() => {
            setDeleteConfirmOpen(false)
            setStudentToDelete(null)
          }}
          onConfirm={handleRemoveStudent}
        />
      )}

      {selectedIds.length > 0 && activeTab === "students" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 border border-slate-800 animate-in slide-in-from-bottom duration-300">
          <span className="text-sm font-semibold text-slate-300">
            Terpilih <span className="text-white font-bold bg-slate-800 px-2 py-1 rounded-md ml-1">{selectedIds.length}</span>
          </span>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 size={14} />
              Hapus dari Kelas
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {bulkDeleteConfirmOpen && (
        <AdminConfirmModal
          title="Hapus Mahasiswa dari Kelas"
          message={`Apakah Anda yakin ingin menghapus ${selectedIds.length} mahasiswa terpilih dari kelas ini?`}
          confirmLabel="Hapus Semua"
          cancelLabel="Batal"
          variant="danger"
          loading={deleting}
          onCancel={() => setBulkDeleteConfirmOpen(false)}
          onConfirm={handleBulkRemoveStudent}
        />
      )}
    </AdminLayout>
  )
}
