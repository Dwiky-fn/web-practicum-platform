import { ChevronDown, FileUp, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminButton,
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
  adminLecturers,
  adminStudents,
  type AdminLecturer,
  type AdminStudent,
  type UserRoleTab,
} from "../data/adminData"

type ModalMode = "add" | "import" | "menu" | null

export default function AdminUsersPage() {
  const params = useParams<{ role?: UserRoleTab }>()
  const role = params.role === "lecturers" ? "lecturers" : "students"
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [semester, setSemester] = useState("all")
  const [modal, setModal] = useState<ModalMode>(null)
  const isStudent = role === "students"

  const students = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return adminStudents.filter((student) => {
      const matchKeyword = !normalized ||
        [student.nim, student.fullname, student.email].some((value) =>
          value.toLowerCase().includes(normalized),
        )
      const matchSemester = semester === "all" || String(student.semester) === semester
      return matchKeyword && matchSemester
    })
  }, [keyword, semester])

  const lecturers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return adminLecturers.filter((lecturer) =>
      !normalized ||
      [lecturer.nip, lecturer.fullname, lecturer.email].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
  }, [keyword])

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
              <AdminButton onClick={() => setModal(null)}>Import</AdminButton>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700">Upload File (CSV / Excel)</p>
              <AdminButton variant="secondary" className="mt-3">
                <FileUp size={16} />
                Pilih File
              </AdminButton>
            </div>
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Catatan:</p>
              <p>
                Format: {isStudent ? "NIM, Nama, Angkatan, Semester, Email" : "NIP, Nama, Email"}
              </p>
              <p>Status default: Aktif</p>
            </div>
          </div>
        </AdminModal>
      )
    }

    return (
      <AdminModal
        title={title}
        onClose={() => setModal(null)}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setModal(null)}>Batal</AdminButton>
            <AdminButton onClick={() => setModal(null)}>Tambah</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <FieldRow label={isStudent ? "NIM" : "NIP"}>
            <input className={inputClass} defaultValue={isStudent ? "3202316008" : "1997xxxxxx"} />
          </FieldRow>
          <FieldRow label="Nama Lengkap">
            <input className={inputClass} defaultValue="Hafidz Syadi" />
          </FieldRow>
          {isStudent && (
            <>
              <FieldRow label="Angkatan">
                <select className={inputClass} defaultValue="2025">
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                </select>
              </FieldRow>
              <FieldRow label="Semester">
                <select className={inputClass} defaultValue="5">
                  <option>1</option>
                  <option>3</option>
                  <option>5</option>
                </select>
              </FieldRow>
            </>
          )}
          <FieldRow label="Email">
            <input className={inputClass} defaultValue="email@domain.com" />
          </FieldRow>
          <FieldRow label="Status">
            <select className={inputClass} defaultValue="Aktif">
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>
          </FieldRow>
        </div>
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
                <option value="1">Semester 1</option>
                <option value="3">Semester 3</option>
                <option value="5">Semester 5</option>
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

      {isStudent ? (
        students.length ? (
          <AdminTable headers={["NIM", "Nama", "Semester", "Status", "Aksi"]}>
            {students.map((student: AdminStudent) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-mono tracking-wide">{student.nim}</td>
                <td className="px-4 py-3">{student.fullname}</td>
                <td className="px-4 py-3">{student.semester}</td>
                <td className="px-4 py-3">{student.status}</td>
                <td className="px-4 py-3">
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => navigate(`/admin/users/students/${student.id}`)}
                  >
                    Detail
                  </AdminButton>
                </td>
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
          {lecturers.map((lecturer: AdminLecturer) => (
            <tr key={lecturer.id}>
              <td className="px-4 py-3 font-mono tracking-wide">{lecturer.nip}</td>
              <td className="px-4 py-3">{lecturer.fullname}</td>
              <td className="px-4 py-3">{lecturer.email}</td>
              <td className="px-4 py-3">{lecturer.status}</td>
              <td className="px-4 py-3">
                <AdminButton
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => navigate(`/admin/users/lecturers/${lecturer.id}`)}
                >
                  Detail
                </AdminButton>
              </td>
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
    </AdminLayout>
  )
}
