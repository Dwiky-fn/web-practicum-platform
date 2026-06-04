import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Avatar from "../../../components/Avatar"
import AdminLayout from "../components/AdminLayout"
import { AdminPanel, AdminSectionHeader, inputClass } from "../components/AdminUI"
import { getAdminUserById } from "../../../services/admin/service"
import type { AdminLecturer, AdminStudent } from "../../../services/admin/types"

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input className={`${inputClass} mt-2 w-full bg-gray-50`} value={value} readOnly />
    </label>
  )
}

export default function AdminUserProfilePage() {
  const { role, id } = useParams<{ role: "students" | "lecturers"; id: string }>()
  const navigate = useNavigate()
  const isStudent = role !== "lecturers"
  const [data, setData] = useState<AdminStudent | AdminLecturer | null>(null)
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
        <h1 className="text-2xl font-semibold text-gray-900">
          Profil {isStudent ? "Mahasiswa" : "Dosen"}
        </h1>
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
    </AdminLayout>
  )
}
