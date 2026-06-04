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
  const [confirm, setConfirm] = useState<{
    action: ConfirmAction
    user: AdminStudent | AdminLecturer
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const isStudent = role === "students"
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
        await createAdminLecturer({
          nip: String(form.get("identifier") || ""),
          fullname: String(form.get("fullname") || ""),
          email: String(form.get("email") || ""),
          status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
        })
      }

      setModal(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengguna")
    }
  }

  const closeUserModal = () => {
    setModal(null)
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    try {
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
              <AdminButton variant="secondary" onClick={() => setModal(null)}>Batal</AdminButton>
              <AdminButton onClick={() => setModal(null)} disabled>Import</AdminButton>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700">Upload File (CSV / Excel)</p>
              <AdminButton variant="secondary" className="mt-3" disabled>
                <FileUp size={16} />
                Pilih File
              </AdminButton>
            </div>
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Catatan:</p>
              <p>
                Format: {isStudent ? "NIM, Nama, Angkatan, Semester, Email" : "NIP, Nama, Email"}
              </p>
              <p>Import banyak belum diaktifkan.</p>
            </div>
          </div>
        </AdminModal>
      )
    }

    return (
      <AdminModal
        title={title}
        onClose={closeUserModal}
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeUserModal}>Batal</AdminButton>
            <AdminButton type="submit" form="admin-user-form">Tambah</AdminButton>
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

      {loading ? (
        <EmptyState title="Memuat data pengguna..." />
      ) : isStudent ? (
        students.length ? (
          <AdminTable headers={["NIM", "Nama", "Semester", "Status", "Aksi"]}>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-mono tracking-wide">{student.nim}</td>
                <td className="px-4 py-3">{student.fullname}</td>
                <td className="px-4 py-3">{student.semester}</td>
                <td className="px-4 py-3">{student.status}</td>
                <AdminActionCell>
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => navigate(`/admin/users/students/${student.id}`)}
                  >
                    Detail
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => setConfirm({
                      action: student.status === "Aktif" ? "deactivate" : "activate",
                      user: student,
                    })}
                  >
                    {student.status === "Aktif" ? <UserX size={14} /> : <UserCheck size={14} />}
                    {student.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    className="h-8 px-2"
                    onClick={() => setConfirm({ action: "delete", user: student })}
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
        <AdminTable headers={["NIP", "Nama", "Email", "Status", "Aksi"]}>
          {lecturers.map((lecturer) => (
            <tr key={lecturer.id}>
              <td className="px-4 py-3 font-mono tracking-wide">{lecturer.nip}</td>
              <td className="px-4 py-3">{lecturer.fullname}</td>
              <td className="px-4 py-3">{lecturer.email}</td>
              <td className="px-4 py-3">{lecturer.status}</td>
              <AdminActionCell>
                <AdminButton
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => navigate(`/admin/users/lecturers/${lecturer.id}`)}
                >
                  Detail
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setConfirm({
                    action: lecturer.status === "Aktif" ? "deactivate" : "activate",
                    user: lecturer,
                  })}
                >
                  {lecturer.status === "Aktif" ? <UserX size={14} /> : <UserCheck size={14} />}
                  {lecturer.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  className="h-8 px-2"
                  onClick={() => setConfirm({ action: "delete", user: lecturer })}
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
        />
      )}
    </AdminLayout>
  )
}
