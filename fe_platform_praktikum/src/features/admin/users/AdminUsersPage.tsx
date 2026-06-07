import { ChevronDown, FileUp, Plus, Trash2, UserCheck, UserX } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminButton,
  AdminActionCell,
  AdminConfirmModal,
  AdminModal,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSelect,
  AdminTable,
  EmptyState,
  FieldRow,
  inputClass,
} from "../components/AdminUI"
import {
  activateAdminUser,
  createAdminLecturer,
  createAdminStudent,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminSemesters,
  getAdminUsers,
} from "../../../services/admin/service"
import type {
  AcademicSemester,
  AdminLecturer,
  AdminStudent,
  UserRoleTab,
} from "../../../services/admin/types"
import {
  getAcademicYearOptions,
  getActiveSemester,
  getStudentSemesterOptions,
} from "../academic/semesterOptions"

type ModalMode = "add" | "import" | "menu" | null
type ConfirmAction = "activate" | "deactivate" | "delete"

function parseCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((value) => value.trim()))
    .filter((row) => row.length > 1)
}

export default function AdminUsersPage() {
  const params = useParams<{ role?: UserRoleTab }>()
  const role = params.role === "lecturers" ? "lecturers" : "students"
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [semester, setSemester] = useState("all")
  const [modal, setModal] = useState<ModalMode>(null)
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [confirm, setConfirm] = useState<{
    action: ConfirmAction
    user: AdminStudent | AdminLecturer
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const isStudent = role === "students"

  // Multi-select & Long Press state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkConfirm, setBulkConfirm] = useState<{
    action: ConfirmAction
    ids: string[]
  } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<any>(null)
  const [longPressActive, setLongPressActive] = useState(false)

  // Clear selections when role changes
  useEffect(() => {
    setSelectedIds([])
  }, [role])

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleMouseDown = (userId: string) => {
    setLongPressActive(false)
    const timer = setTimeout(() => {
      setLongPressActive(true)
      toggleSelection(userId)
    }, 600)
    setLongPressTimer(timer)
  }

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleMouseUp = (userId: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
      if (!longPressActive) {
        if (selectedIds.length > 0) {
          toggleSelection(userId)
        }
      }
    }
  }

  const handleTouchStart = (userId: string) => {
    handleMouseDown(userId)
  }

  const handleTouchEnd = (userId: string) => {
    handleMouseUp(userId)
  }

  const handleBulkActionSubmit = async () => {
    if (!bulkConfirm) return
    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")
      const { action, ids } = bulkConfirm
      if (action === "activate") {
        await Promise.all(ids.map((id) => activateAdminUser(id)))
        setSuccessMessage(`${ids.length} pengguna berhasil diaktifkan.`)
      } else if (action === "deactivate") {
        await Promise.all(ids.map((id) => deactivateAdminUser(id)))
        setSuccessMessage(`${ids.length} pengguna berhasil dinonaktifkan.`)
      } else {
        await Promise.all(ids.map((id) => deleteAdminUser(id)))
        setSuccessMessage(`${ids.length} pengguna berhasil dihapus.`)
      }
      setSelectedIds([])
      setBulkConfirm(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses aksi massal")
    } finally {
      setSubmitting(false)
    }
  }
  const activeSemester = getActiveSemester(semesters)
  const studentSemesterOptions = getStudentSemesterOptions(activeSemester?.term)
  const academicYearOptions = getAcademicYearOptions(semesters)
  const fallbackAcademicYears = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const data = await getAdminUsers(role, {
        keyword,
        semester: isStudent ? semester : undefined,
      })

      if (isStudent) {
        setStudents(data as AdminStudent[])
      } else {
        setLecturers(data as AdminLecturer[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data pengguna")
    } finally {
      setLoading(false)
    }
  }, [isStudent, keyword, role, semester])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    async function fetchSemesters() {
      try {
        const data = await getAdminSemesters()
        setSemesters(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengambil data semester")
      }
    }

    fetchSemesters()
  }, [])

  useEffect(() => {
    if (semester !== "all" && !studentSemesterOptions.includes(Number(semester))) {
      setSemester("all")
    }
  }, [semester, studentSemesterOptions])

  const handleAddSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")
      if (isStudent) {
        await createAdminStudent({
          nim: String(form.get("identifier") || ""),
          fullname: String(form.get("fullname") || ""),
          email: String(form.get("email") || ""),
          angkatan: Number(form.get("angkatan") || 0),
          semester: Number(form.get("semester") || 0),
          status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
        })
      } else {
        const lecturer = await createAdminLecturer({
          nip: String(form.get("identifier") || ""),
          fullname: String(form.get("fullname") || ""),
          email: String(form.get("email") || ""),
          status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
        })
        if (lecturer.initialPassword) {
          setSuccessMessage(`Dosen berhasil ditambahkan. Password awal: ${lecturer.initialPassword}`)
        }
      }

      setModal(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengguna")
    } finally {
      setSubmitting(false)
    }
  }

  const handleImportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!importFile) return

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")
      const rows = parseCsv(await importFile.text())
      const normalizedRows = rows[0]?.[0]?.toLowerCase().includes(isStudent ? "nim" : "nip")
        ? rows.slice(1)
        : rows

      for (const row of normalizedRows) {
        if (isStudent) {
          const [nim, fullname, angkatan, semesterValue, email] = row
          await createAdminStudent({
            nim,
            fullname,
            angkatan: Number(angkatan || 0),
            semester: Number(semesterValue || 0),
            email,
            status: "Aktif",
          })
        } else {
          const [nip, fullname, email] = row
          await createAdminLecturer({
            nip,
            fullname,
            email,
            status: "Aktif",
          })
        }
      }

      setImportFile(null)
      setModal(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengimport pengguna")
    } finally {
      setSubmitting(false)
    }
  }

  const closeUserModal = () => {
    setModal(null)
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    try {
      setActionLoading(`${confirm.action}-${confirm.user.id}`)
      setError("")
      if (confirm.action === "activate") {
        await activateAdminUser(confirm.user.id)
      } else if (confirm.action === "deactivate") {
        await deactivateAdminUser(confirm.user.id)
      } else {
        await deleteAdminUser(confirm.user.id)
      }

      setConfirm(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pengguna")
    } finally {
      setActionLoading("")
    }
  }

  const renderAddModal = () => {
    if (!modal || modal === "menu") return null

    const title = modal === "import"
      ? `Import ${isStudent ? "Mahasiswa" : "Dosen"}`
      : `Tambah ${isStudent ? "Mahasiswa" : "Dosen"}`

    if (modal === "import") {
      return (
        <AdminModal
          title={title}
          onClose={() => setModal(null)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModal(null)} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-import-form" disabled={submitting || !importFile}>
                {submitting ? "Mengimport..." : "Import"}
              </AdminButton>
            </>
          }
        >
          <form id="admin-import-form" className="space-y-5" onSubmit={handleImportSubmit}>
            <div>
              <p className="text-sm font-medium text-gray-700">Upload File CSV</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100">
                <FileUp size={16} />
                {importFile ? importFile.name : "Pilih File"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Catatan:</p>
              <p>
                Format: {isStudent ? "NIM, Nama, Angkatan, Semester, Email" : "NIP, Nama, Email"}
              </p>
            </div>
          </form>
        </AdminModal>
      )
    }

    return (
      <AdminModal
        title={title}
        onClose={closeUserModal}
        footer={
          <>
              <AdminButton variant="secondary" onClick={closeUserModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-user-form" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Tambah"}
              </AdminButton>
          </>
        }
      >
        <form id="admin-user-form" className="space-y-4" onSubmit={handleAddSubmit}>
          <FieldRow label={isStudent ? "NIM" : "NIP"}>
            <input
              name="identifier"
              className={inputClass}
              placeholder={isStudent ? "Masukkan NIM" : "Masukkan NIP"}
              required
            />
          </FieldRow>
          <FieldRow label="Nama Lengkap">
            <input name="fullname" className={inputClass} placeholder="Masukkan nama lengkap" required />
          </FieldRow>
          {isStudent && (
            <>
              <FieldRow label="Angkatan">
                <select name="angkatan" className={inputClass} required>
                  <option value="" disabled>Pilih angkatan</option>
                  {(academicYearOptions.length ? academicYearOptions : fallbackAcademicYears).map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Semester">
                <select name="semester" className={inputClass} required>
                  <option value="" disabled>Pilih semester</option>
                  {studentSemesterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </FieldRow>
            </>
          )}
          <FieldRow label="Email">
            <input name="email" className={inputClass} type="email" placeholder="Masukkan email" required />
          </FieldRow>
          <FieldRow label="Status">
            <select name="status" className={inputClass} required>
              <option value="" disabled>Pilih status</option>
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>
          </FieldRow>
        </form>
      </AdminModal>
    )
  }

  return (
    <AdminLayout>
      <AdminSectionHeader
        title={isStudent ? "Daftar Mahasiswa" : "Daftar Dosen"}
        description={`Mengelola data ${isStudent ? "mahasiswa" : "dosen"} Program Studi Teknik Informatika`}
        actions={
          <>
            {isStudent && (
              <AdminSelect value={semester} onChange={setSemester} label="Filter semester">
                <option value="all">Semua Semester</option>
                {studentSemesterOptions.map((option) => (
                  <option key={option} value={option}>Semester {option}</option>
                ))}
              </AdminSelect>
            )}
            <AdminSearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder={isStudent ? "Cari NIM / Nama" : "Cari NIP / Nama"}
            />
            <div className="relative">
              <AdminButton onClick={() => setModal(modal === "menu" ? null : "menu")}>
                <Plus size={16} />
                Tambah {isStudent ? "Mahasiswa" : "Dosen"}
                <ChevronDown size={16} />
              </AdminButton>
              {modal === "menu" && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onClick={() => setModal("add")}
                  >
                    Tambah Satu
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onClick={() => setModal("import")}
                  >
                    Import Banyak
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {successMessage}
        </div>
      )}

      {loading ? (
        <EmptyState title="Memuat data pengguna..." />
      ) : isStudent ? (
        students.length ? (
          <AdminTable headers={selectedIds.length > 0 ? ["", "NIM", "Nama", "Semester", "Status", "Aksi"] : ["NIM", "Nama", "Semester", "Status", "Aksi"]}>
            {students.map((student) => (
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
                <td className="px-4 py-3 font-mono tracking-wide">{student.nim}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{student.fullname}</span>
                </td>
                <td className="px-4 py-3">{student.semester}</td>
                <td className="px-4 py-3">{student.status}</td>
                <AdminActionCell>
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(`/users/students/${student.id}`)
                    }}
                  >
                    Detail
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    disabled={Boolean(actionLoading)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      setConfirm({
                        action: student.status === "Aktif" ? "deactivate" : "activate",
                        user: student,
                      })
                    }}
                  >
                    {student.status === "Aktif" ? <UserX size={14} /> : <UserCheck size={14} />}
                    {student.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    className="h-8 px-2"
                    disabled={Boolean(actionLoading)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      setConfirm({ action: "delete", user: student })
                    }}
                  >
                    <Trash2 size={14} />
                    Hapus
                  </AdminButton>
                </AdminActionCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState
            title="Belum ada data mahasiswa"
            action={<AdminButton onClick={() => setModal("add")}><Plus size={16} />Tambah Mahasiswa</AdminButton>}
          />
        )
      ) : lecturers.length ? (
        <AdminTable headers={selectedIds.length > 0 ? ["", "NIP", "Nama", "Email", "Status", "Aksi"] : ["NIP", "Nama", "Email", "Status", "Aksi"]}>
          {lecturers.map((lecturer) => (
            <tr
              key={lecturer.id}
              className={`${selectedIds.includes(lecturer.id) ? "bg-blue-50/40" : ""} cursor-default select-none`}
              onMouseDown={() => handleMouseDown(lecturer.id)}
              onMouseUp={() => handleMouseUp(lecturer.id)}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => handleTouchStart(lecturer.id)}
              onTouchEnd={() => handleTouchEnd(lecturer.id)}
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
                    checked={selectedIds.includes(lecturer.id)}
                    onChange={() => toggleSelection(lecturer.id)}
                  />
                </td>
              )}
              <td className="px-4 py-3 font-mono tracking-wide">{lecturer.nip}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{lecturer.fullname}</span>
              </td>
              <td className="px-4 py-3">{lecturer.email}</td>
              <td className="px-4 py-3">{lecturer.status}</td>
              <AdminActionCell>
                <AdminButton
                  variant="ghost"
                  className="h-8 px-2"
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/users/lecturers/${lecturer.id}`)
                  }}
                >
                  Detail
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={Boolean(actionLoading)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirm({
                      action: lecturer.status === "Aktif" ? "deactivate" : "activate",
                      user: lecturer,
                    })
                  }}
                >
                  {lecturer.status === "Aktif" ? <UserX size={14} /> : <UserCheck size={14} />}
                  {lecturer.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  className="h-8 px-2"
                  disabled={Boolean(actionLoading)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirm({ action: "delete", user: lecturer })
                  }}
                >
                  <Trash2 size={14} />
                  Hapus
                </AdminButton>
              </AdminActionCell>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          title="Belum ada data dosen"
          action={<AdminButton onClick={() => setModal("add")}><Plus size={16} />Tambah Dosen</AdminButton>}
        />
      )}

      {renderAddModal()}
      {confirm && (
        <AdminConfirmModal
          title={
            confirm.action === "delete"
              ? "Hapus Pengguna?"
              : confirm.action === "activate"
              ? "Aktifkan Pengguna?"
              : "Nonaktifkan Pengguna?"
          }
          message={
            confirm.action === "delete"
              ? `Pengguna ${confirm.user.fullname} akan dihapus dari sistem.`
              : confirm.action === "activate"
              ? `Pengguna ${confirm.user.fullname} akan diaktifkan kembali.`
              : `Pengguna ${confirm.user.fullname} akan dinonaktifkan.`
          }
          confirmLabel={
            confirm.action === "delete"
              ? "Hapus"
              : confirm.action === "activate"
              ? "Aktifkan"
              : "Nonaktifkan"
          }
          variant={confirm.action === "delete" ? "danger" : "primary"}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirmAction}
          loading={actionLoading === `${confirm.action}-${confirm.user.id}`}
        />
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 border border-slate-800 animate-in slide-in-from-bottom duration-300">
          <span className="text-sm font-semibold text-slate-300">
            Terpilih <span className="text-white font-bold bg-slate-800 px-2 py-1 rounded-md ml-1">{selectedIds.length}</span>
          </span>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkConfirm({ action: "activate", ids: selectedIds })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-xs font-semibold transition cursor-pointer"
            >
              <UserCheck size={14} />
              Aktifkan
            </button>
            <button
              type="button"
              onClick={() => setBulkConfirm({ action: "deactivate", ids: selectedIds })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-xs font-semibold transition cursor-pointer"
            >
              <UserX size={14} />
              Nonaktifkan
            </button>
            <button
              type="button"
              onClick={() => setBulkConfirm({ action: "delete", ids: selectedIds })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 size={14} />
              Hapus
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

      {bulkConfirm && (
        <AdminConfirmModal
          title={
            bulkConfirm.action === "delete"
              ? `Hapus ${bulkConfirm.ids.length} Pengguna?`
              : bulkConfirm.action === "activate"
              ? `Aktifkan ${bulkConfirm.ids.length} Pengguna?`
              : `Nonaktifkan ${bulkConfirm.ids.length} Pengguna?`
          }
          message={
            bulkConfirm.action === "delete"
              ? `Apakah Anda yakin ingin menghapus ${bulkConfirm.ids.length} pengguna dari sistem? Tindakan ini tidak dapat dibatalkan.`
              : bulkConfirm.action === "activate"
              ? `Apakah Anda yakin ingin mengaktifkan kembali ${bulkConfirm.ids.length} pengguna?`
              : `Apakah Anda yakin ingin menonaktifkan ${bulkConfirm.ids.length} pengguna?`
          }
          confirmLabel={
            bulkConfirm.action === "delete"
              ? "Hapus Semua"
              : bulkConfirm.action === "activate"
              ? "Aktifkan Semua"
              : "Nonaktifkan Semua"
          }
          variant={bulkConfirm.action === "delete" ? "danger" : "primary"}
          onCancel={() => setBulkConfirm(null)}
          onConfirm={handleBulkActionSubmit}
          loading={submitting}
        />
      )}
    </AdminLayout>
  )
}
