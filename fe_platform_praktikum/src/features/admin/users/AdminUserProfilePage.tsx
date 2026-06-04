import { ArrowLeft, Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Avatar from "../../../components/Avatar"
import AdminLayout from "../components/AdminLayout"
import {
  AdminButton,
  AdminModal,
  AdminPanel,
  AdminSectionHeader,
  FieldRow,
  inputClass,
} from "../components/AdminUI"
import {
  getAdminSemesters,
  getAdminUserById,
  updateAdminUser,
} from "../../../services/admin/service"
import type {
  AcademicSemester,
  AdminLecturer,
  AdminStudent,
} from "../../../services/admin/types"
import {
  getAcademicYearOptions,
  getActiveSemester,
  getStudentSemesterOptions,
} from "../academic/semesterOptions"

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input className={`${inputClass} mt-2 w-full bg-gray-50`} value={value} readOnly />
    </label>
  )
}

type UserFormState = {
  identifier: string
  fullname: string
  email: string
  angkatan: string
  semester: string
  status: "Aktif" | "Nonaktif" | ""
}

const emptyUserForm: UserFormState = {
  identifier: "",
  fullname: "",
  email: "",
  angkatan: "",
  semester: "",
  status: "",
}

export default function AdminUserProfilePage() {
  const { role, id } = useParams<{ role: "students" | "lecturers"; id: string }>()
  const navigate = useNavigate()
  const isStudent = role !== "lecturers"
  const [data, setData] = useState<AdminStudent | AdminLecturer | null>(null)
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError("")
    getAdminUserById(id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Profil tidak ditemukan"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    getAdminSemesters()
      .then(setSemesters)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal mengambil data semester"))
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <AdminSectionHeader title="Memuat profil..." />
      </AdminLayout>
    )
  }

  if (!data || error) {
    return (
      <AdminLayout>
        <AdminSectionHeader title="Profil tidak ditemukan" description={error} />
      </AdminLayout>
    )
  }

  const student = isStudent ? data as AdminStudent : null
  const lecturer = !isStudent ? data as AdminLecturer : null
  const activeSemester = getActiveSemester(semesters)
  const studentSemesterOptions = getStudentSemesterOptions(activeSemester?.term)
  const academicYearOptions = getAcademicYearOptions(semesters)
  const fallbackAcademicYears = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index)
  const userAcademicYearOptions = Array.from(
    new Set([
      ...(academicYearOptions.length ? academicYearOptions : fallbackAcademicYears),
      ...(userForm.angkatan ? [Number(userForm.angkatan)] : []),
    ]),
  )
    .filter((option) => Number.isFinite(option) && option > 0)
    .sort((a, b) => b - a)
  const userSemesterOptions = Array.from(
    new Set([
      ...studentSemesterOptions,
      ...(userForm.semester ? [Number(userForm.semester)] : []),
    ]),
  )
    .filter((option) => Number.isFinite(option) && option > 0)
    .sort((a, b) => a - b)

  const openEdit = () => {
    setUserForm({
      identifier: student ? student.nim : lecturer?.nip || "",
      fullname: data.fullname,
      email: data.email,
      angkatan: student ? String(student.angkatan || "") : "",
      semester: student ? String(student.semester || "") : "",
      status: data.status,
    })
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setUserForm(emptyUserForm)
  }

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id) return

    try {
      const updated = await updateAdminUser(id, student ? {
        nim: userForm.identifier,
        fullname: userForm.fullname,
        email: userForm.email,
        angkatan: Number(userForm.angkatan || 0),
        semester: Number(userForm.semester || 0),
        status: userForm.status as "Aktif" | "Nonaktif",
      } : {
        nip: userForm.identifier,
        fullname: userForm.fullname,
        email: userForm.email,
        status: userForm.status as "Aktif" | "Nonaktif",
      })

      setData(updated)
      closeEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui pengguna")
    }
  }

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={() => navigate(`/admin/users/${role ?? "students"}`)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <AdminPanel className="mx-auto max-w-5xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Profil {isStudent ? "Mahasiswa" : "Dosen"}
          </h1>
          <AdminButton onClick={openEdit}>
            <Pencil size={16} />
            Edit
          </AdminButton>
        </div>
        <div className="mt-4 border-t border-gray-200 pt-6">
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold text-gray-700">Foto Diri</p>
            <Avatar avatarUrl={data.avatarUrl} fullname={data.fullname} size={120} />
          </div>

          {student ? (
            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Nama Lengkap" value={student.fullname} />
              <ReadOnlyField label="Angkatan" value={student.angkatan || "-"} />
              <ReadOnlyField label="Nomor Induk Mahasiswa (NIM)" value={student.nim || "-"} />
              <ReadOnlyField label="Semester" value={student.semester || "-"} />
              <ReadOnlyField label="Program Studi" value={student.programStudi} />
              <ReadOnlyField label="Status" value={student.status} />
              <ReadOnlyField label="Jurusan" value={student.jurusan} />
              <ReadOnlyField label="Email" value={student.email} />
            </div>
          ) : lecturer ? (
            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Nama Lengkap" value={lecturer.fullname} />
              <ReadOnlyField label="No. Telpon" value={lecturer.phone || "-"} />
              <ReadOnlyField label="Nomor Induk Pegawai (NIP)" value={lecturer.nip || "-"} />
              <ReadOnlyField label="Tempat Tanggal Lahir" value={lecturer.birthInfo || "-"} />
              <ReadOnlyField label="Email" value={lecturer.email} />
              <ReadOnlyField label="Jenis Kelamin" value={lecturer.gender || "-"} />
              <ReadOnlyField label="Status" value={lecturer.status} />
              <ReadOnlyField label="Kota Domisili" value={lecturer.city || "-"} />
            </div>
          ) : null}
        </div>
      </AdminPanel>

      {editOpen && (
        <AdminModal
          title={`Edit ${isStudent ? "Mahasiswa" : "Dosen"}`}
          onClose={closeEdit}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeEdit}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-user-profile-edit-form">Simpan</AdminButton>
            </>
          }
        >
          <form id="admin-user-profile-edit-form" className="space-y-4" onSubmit={handleEditSubmit}>
            <FieldRow label={isStudent ? "NIM" : "NIP"}>
              <input
                name="identifier"
                className={inputClass}
                value={userForm.identifier}
                onChange={(event) => setUserForm((form) => ({ ...form, identifier: event.target.value }))}
                placeholder={isStudent ? "Masukkan NIM" : "Masukkan NIP"}
                required
              />
            </FieldRow>
            <FieldRow label="Nama Lengkap">
              <input
                name="fullname"
                className={inputClass}
                value={userForm.fullname}
                onChange={(event) => setUserForm((form) => ({ ...form, fullname: event.target.value }))}
                placeholder="Masukkan nama lengkap"
                required
              />
            </FieldRow>
            {isStudent && (
              <>
                <FieldRow label="Angkatan">
                  <select
                    name="angkatan"
                    className={inputClass}
                    value={userForm.angkatan}
                    onChange={(event) => setUserForm((form) => ({ ...form, angkatan: event.target.value }))}
                    required
                  >
                    <option value="" disabled>Pilih angkatan</option>
                    {userAcademicYearOptions.map((year) => (
                      <option key={year}>{year}</option>
                    ))}
                  </select>
                </FieldRow>
                <FieldRow label="Semester">
                  <select
                    name="semester"
                    className={inputClass}
                    value={userForm.semester}
                    onChange={(event) => setUserForm((form) => ({ ...form, semester: event.target.value }))}
                    required
                  >
                    <option value="" disabled>Pilih semester</option>
                    {userSemesterOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </FieldRow>
              </>
            )}
            <FieldRow label="Email">
              <input
                name="email"
                className={inputClass}
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm((form) => ({ ...form, email: event.target.value }))}
                placeholder="Masukkan email"
                required
              />
            </FieldRow>
            <FieldRow label="Status">
              <select
                name="status"
                className={inputClass}
                value={userForm.status}
                onChange={(event) => setUserForm((form) => ({
                  ...form,
                  status: event.target.value as "Aktif" | "Nonaktif" | "",
                }))}
                required
              >
                <option value="" disabled>Pilih status</option>
                <option>Aktif</option>
                <option>Nonaktif</option>
              </select>
            </FieldRow>
          </form>
        </AdminModal>
      )}
    </AdminLayout>
  )
}
