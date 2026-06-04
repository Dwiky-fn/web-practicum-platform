import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminButton,
  AdminModal,
  AdminPanel,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSelect,
  AdminTable,
  AdminTabs,
  EmptyState,
  FieldRow,
  inputClass,
} from "../components/AdminUI"
import {
  academicClasses,
  academicCourses,
  adminLecturers,
  semesters,
  type AdminTab,
} from "../data/adminData"

type ModalMode = "semester" | "course" | "class" | "activate" | null

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "semester", label: "Semester" },
  { id: "courses", label: "Mata Kuliah" },
  { id: "classes", label: "Kelas" },
]

export default function AdminAcademicPage() {
  const [searchParams] = useSearchParams()
  const queryTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<AdminTab>(
    queryTab === "courses" || queryTab === "classes" ? queryTab : "semester",
  )
  const [keyword, setKeyword] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modal, setModal] = useState<ModalMode>(null)
  const navigate = useNavigate()

  const filteredCourses = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return academicCourses.filter((course) => {
      const matchKeyword = !normalized ||
        [course.code, course.name].some((value) => value.toLowerCase().includes(normalized))
      const matchSemester = semesterFilter === "all" || String(course.semester) === semesterFilter
      const matchStatus = statusFilter === "all" || course.status === statusFilter
      return matchKeyword && matchSemester && matchStatus
    })
  }, [keyword, semesterFilter, statusFilter])

  const filteredClasses = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return academicClasses.filter((item) => {
      const matchKeyword = !normalized ||
        [item.name, item.courseName, item.lecturer].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = statusFilter === "all" || item.status === statusFilter
      return matchKeyword && matchStatus
    })
  }, [keyword, statusFilter])

  const activeSemester = semesters.find((semester) => semester.status === "Aktif")

  const closeModal = () => setModal(null)

  const renderModal = () => {
    if (!modal) return null

    if (modal === "activate") {
      return (
        <AdminModal
          title="Aktifkan Semester?"
          onClose={closeModal}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton>
              <AdminButton onClick={closeModal}>Aktifkan</AdminButton>
            </>
          }
        >
          <p className="text-center text-sm text-gray-700">
            Semester 2025/2026 - Genap akan dijadikan semester aktif. Semester aktif sebelumnya akan dinonaktifkan.
          </p>
        </AdminModal>
      )
    }

    if (modal === "semester") {
      return (
        <AdminModal
          title="Tambah Semester"
          onClose={closeModal}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton>
              <AdminButton onClick={closeModal}>Tambah</AdminButton>
            </>
          }
        >
          <div className="space-y-4">
            <FieldRow label="Tahun Ajaran">
              <div className="flex items-center gap-2">
                <input className={`${inputClass} w-28`} defaultValue="2025" />
                <span>/</span>
                <input className={`${inputClass} w-28`} defaultValue="2026" />
              </div>
            </FieldRow>
            <FieldRow label="Semester">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="term" defaultChecked /> Genap</label>
                <label className="flex items-center gap-2"><input type="radio" name="term" /> Ganjil</label>
              </div>
            </FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="status" defaultChecked /> Aktif</label>
                <label className="flex items-center gap-2"><input type="radio" name="status" /> Nonaktif</label>
              </div>
            </FieldRow>
          </div>
        </AdminModal>
      )
    }

    if (modal === "course") {
      return (
        <AdminModal
          title="Tambah Mata Kuliah"
          onClose={closeModal}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton>
              <AdminButton onClick={closeModal}>Tambah</AdminButton>
            </>
          }
        >
          <div className="space-y-4">
            <FieldRow label="Kode MK"><input className={inputClass} defaultValue="TIF11018" /></FieldRow>
            <FieldRow label="Mata Kuliah"><input className={inputClass} defaultValue="Basis Data" /></FieldRow>
            <FieldRow label="Semester Mahasiswa">
              <select className={inputClass} defaultValue="5"><option>3</option><option>5</option></select>
            </FieldRow>
            <FieldRow label="Jumlah SKS"><input className={inputClass} defaultValue="3" /></FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="courseStatus" defaultChecked /> Aktif</label>
                <label className="flex items-center gap-2"><input type="radio" name="courseStatus" /> Nonaktif</label>
              </div>
            </FieldRow>
          </div>
        </AdminModal>
      )
    }

    return (
      <AdminModal
        title="Tambah Kelas"
        onClose={closeModal}
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton>
            <AdminButton onClick={closeModal}>Tambah</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <FieldRow label="Semester Akademik"><span className="text-sm font-semibold">2025/2026 - Ganjil</span></FieldRow>
          <FieldRow label="Mata Kuliah">
            <select className={inputClass} defaultValue="Basis Data">
              {academicCourses.map((course) => <option key={course.id}>{course.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Kelas">
            <select className={inputClass} defaultValue="B"><option>A</option><option>B</option><option>C</option></select>
          </FieldRow>
          <FieldRow label="Dosen Pengampu">
            <select className={inputClass} defaultValue={adminLecturers[1]?.fullname}>
              {adminLecturers.map((lecturer) => <option key={lecturer.id}>{lecturer.fullname}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Status">
            <div className="flex gap-5">
              <label className="flex items-center gap-2"><input type="radio" name="classStatus" defaultChecked /> Draft</label>
              <label className="flex items-center gap-2"><input type="radio" name="classStatus" /> Aktif</label>
            </div>
          </FieldRow>
        </div>
      </AdminModal>
    )
  }

  return (
    <AdminLayout>
      <AdminSectionHeader title="Manajemen Akademik" />

      <div className="mx-auto max-w-6xl">
        <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <AdminPanel className="rounded-t-none p-5">
          <p className="mb-5 border-b border-gray-200 pb-4 text-sm text-gray-600">
            {activeTab === "semester" && "Mengatur periode akademik yang digunakan dalam sistem."}
            {activeTab === "courses" && "Mengatur data mata kuliah yang digunakan dalam sistem."}
            {activeTab === "classes" && "Mengatur kelas praktikum berdasarkan mata kuliah dan semester akademik."}
          </p>

          {activeTab === "semester" && (
            <div>
              {activeSemester ? (
                <div className="mb-6 rounded-lg bg-blue-50 p-4">
                  <h2 className="text-lg font-semibold text-blue-950">Semester Aktif</h2>
                  <dl className="mt-3 grid gap-2 text-sm text-blue-950 md:grid-cols-3">
                    <div><dt className="text-blue-700">Tahun Ajaran</dt><dd className="font-semibold">{activeSemester.year}</dd></div>
                    <div><dt className="text-blue-700">Semester</dt><dd className="font-semibold">{activeSemester.term}</dd></div>
                    <div><dt className="text-blue-700">Status</dt><dd className="font-semibold">{activeSemester.status}</dd></div>
                  </dl>
                </div>
              ) : (
                <EmptyState title="Belum ada data semester" action={<AdminButton onClick={() => setModal("semester")}><Plus size={16} />Tambah Semester</AdminButton>} />
              )}

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Daftar Semester</h2>
                <AdminButton onClick={() => setModal("semester")}><Plus size={16} />Tambah Semester</AdminButton>
              </div>
              <AdminTable headers={["Tahun Ajaran", "Semester", "Status", "Aksi"]}>
                {semesters.map((semester) => (
                  <tr key={semester.id}>
                    <td className="px-4 py-3">{semester.year}</td>
                    <td className="px-4 py-3">{semester.term}</td>
                    <td className="px-4 py-3">{semester.status}</td>
                    <td className="px-4 py-3">
                      <AdminButton variant="ghost" className="h-8 px-2" onClick={() => semester.status === "Aktif" ? setModal("semester") : setModal("activate")}>
                        {semester.status === "Aktif" ? "Edit" : "Aktifkan"}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          )}

          {activeTab === "courses" && (
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Daftar Mata Kuliah</h2>
                <div className="flex flex-wrap gap-3">
                  <AdminButton onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>
                  <AdminSelect value={semesterFilter} onChange={setSemesterFilter} label="Semester">
                    <option value="all">Semua Semester</option>
                    <option value="3">Semester 3</option>
                    <option value="5">Semester 5</option>
                  </AdminSelect>
                  <AdminSearchInput value={keyword} onChange={setKeyword} placeholder="Cari Mata Kuliah" />
                </div>
              </div>

              {filteredCourses.length ? (
                <AdminTable headers={["Kode MK", "Mata Kuliah", "Semester", "SKS", "Status", "Aksi"]}>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td className="px-4 py-3 font-mono">{course.code}</td>
                      <td className="px-4 py-3">{course.name}</td>
                      <td className="px-4 py-3">{course.semester}</td>
                      <td className="px-4 py-3">{course.sks}</td>
                      <td className="px-4 py-3">{course.status}</td>
                      <td className="px-4 py-3"><AdminButton variant="ghost" className="h-8 px-2">{course.status === "Aktif" ? "Edit" : "Aktifkan"}</AdminButton></td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada mata kuliah" action={<AdminButton onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>} />
              )}
            </div>
          )}

          {activeTab === "classes" && (
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Daftar Kelas</h2>
                <div className="flex flex-wrap gap-3">
                  <AdminButton onClick={() => setModal("class")}><Plus size={16} />Tambah Kelas</AdminButton>
                  <AdminSelect value={statusFilter} onChange={setStatusFilter} label="Status">
                    <option value="all">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </AdminSelect>
                  <AdminSearchInput value={keyword} onChange={setKeyword} placeholder="Cari Kelas" />
                </div>
              </div>

              {filteredClasses.length ? (
                <AdminTable headers={["Kelas", "Mata Kuliah", "Dosen", "Status", "Aksi"]}>
                  {filteredClasses.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.courseName}</td>
                      <td className="px-4 py-3">{item.lecturer}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">
                        <AdminButton variant="ghost" className="h-8 px-2" onClick={() => navigate(`/admin/classes/${item.id}`)}>
                          Detail
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada kelas pada semester ini" action={<AdminButton onClick={() => setModal("class")}><Plus size={16} />Tambah Kelas</AdminButton>} />
              )}
            </div>
          )}
        </AdminPanel>
      </div>

      {renderModal()}
    </AdminLayout>
  )
}
