import { Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  activateAdminSemester,
  createAdminClass,
  createAdminCourse,
  createAdminSemester,
  getAdminClasses,
  getAdminCourses,
  getAdminSemesters,
  getAdminUsers,
} from "../../../services/admin/service"
import type {
  AcademicClass,
  AcademicCourse,
  AcademicSemester,
  AdminLecturer,
  AdminTab,
} from "../../../services/admin/types"

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
  const [selectedSemester, setSelectedSemester] = useState<AcademicSemester | null>(null)
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [courses, setCourses] = useState<AcademicCourse[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const fetchAcademicData = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const [semesterData, courseData, classData, lecturerData] = await Promise.all([
        getAdminSemesters(),
        getAdminCourses(),
        getAdminClasses(),
        getAdminUsers("lecturers"),
      ])

      setSemesters(semesterData)
      setCourses(courseData)
      setClasses(classData)
      setLecturers(lecturerData as AdminLecturer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data akademik")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAcademicData()
  }, [fetchAcademicData])

  const filteredCourses = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return courses.filter((course) => {
      const matchKeyword = !normalized ||
        [course.code, course.name].some((value) => value.toLowerCase().includes(normalized))
      const matchSemester = semesterFilter === "all" || String(course.semester) === semesterFilter
      const matchStatus = statusFilter === "all" || course.status === statusFilter
      return matchKeyword && matchSemester && matchStatus
    })
  }, [courses, keyword, semesterFilter, statusFilter])

  const filteredClasses = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return classes.filter((item) => {
      const matchKeyword = !normalized ||
        [item.name, item.courseName, item.lecturer].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = statusFilter === "all" || item.status === statusFilter
      return matchKeyword && matchStatus
    })
  }, [classes, keyword, statusFilter])

  const activeSemester = semesters.find((semester) => semester.status === "Aktif")
  const closeModal = () => {
    setModal(null)
    setSelectedSemester(null)
  }

  const handleSemesterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startYear = String(form.get("startYear") || "")
    const endYear = String(form.get("endYear") || "")

    try {
      await createAdminSemester({
        year: `${startYear}/${endYear}`,
        term: String(form.get("term") || "Genap") as "Ganjil" | "Genap",
        status: String(form.get("status") || "Nonaktif") as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan semester")
    }
  }

  const handleCourseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      await createAdminCourse({
        code: String(form.get("code") || ""),
        name: String(form.get("name") || ""),
        semester: Number(form.get("semester") || 0),
        sks: Number(form.get("sks") || 0),
        status: String(form.get("status") || "Aktif") as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan mata kuliah")
    }
  }

  const handleClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      await createAdminClass({
        courseId: String(form.get("courseId") || ""),
        name: String(form.get("name") || ""),
        lecturerId: String(form.get("lecturerId") || ""),
        academicPeriodId: activeSemester?.id,
        status: String(form.get("status") || "Aktif") as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kelas")
    }
  }

  const handleActivateSemester = async () => {
    if (!selectedSemester) return

    try {
      await activateAdminSemester(selectedSemester.id)
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan semester")
    }
  }

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
              <AdminButton onClick={handleActivateSemester}>Aktifkan</AdminButton>
            </>
          }
        >
          <p className="text-center text-sm text-gray-700">
            Semester {selectedSemester?.year} - {selectedSemester?.term} akan dijadikan semester aktif.
            Semester aktif sebelumnya akan dinonaktifkan.
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
              <AdminButton type="submit" form="admin-semester-form">Tambah</AdminButton>
            </>
          }
        >
          <form id="admin-semester-form" className="space-y-4" onSubmit={handleSemesterSubmit}>
            <FieldRow label="Tahun Ajaran">
              <div className="flex items-center gap-2">
                <input name="startYear" className={`${inputClass} w-28`} defaultValue="2025" required />
                <span>/</span>
                <input name="endYear" className={`${inputClass} w-28`} defaultValue="2026" required />
              </div>
            </FieldRow>
            <FieldRow label="Semester">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="term" value="Genap" defaultChecked /> Genap</label>
                <label className="flex items-center gap-2"><input type="radio" name="term" value="Ganjil" /> Ganjil</label>
              </div>
            </FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" defaultChecked /> Aktif</label>
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" /> Nonaktif</label>
              </div>
            </FieldRow>
          </form>
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
              <AdminButton type="submit" form="admin-course-form">Tambah</AdminButton>
            </>
          }
        >
          <form id="admin-course-form" className="space-y-4" onSubmit={handleCourseSubmit}>
            <FieldRow label="Kode MK"><input name="code" className={inputClass} defaultValue="TIF11018" required /></FieldRow>
            <FieldRow label="Mata Kuliah"><input name="name" className={inputClass} defaultValue="Basis Data" required /></FieldRow>
            <FieldRow label="Semester Mahasiswa">
              <select name="semester" className={inputClass} defaultValue="5"><option>1</option><option>3</option><option>5</option><option>6</option></select>
            </FieldRow>
            <FieldRow label="Jumlah SKS"><input name="sks" className={inputClass} defaultValue="3" required /></FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" defaultChecked /> Aktif</label>
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" /> Nonaktif</label>
              </div>
            </FieldRow>
          </form>
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
            <AdminButton type="submit" form="admin-class-form">Tambah</AdminButton>
          </>
        }
      >
        <form id="admin-class-form" className="space-y-4" onSubmit={handleClassSubmit}>
          <FieldRow label="Semester Akademik"><span className="text-sm font-semibold">{activeSemester ? `${activeSemester.year} - ${activeSemester.term}` : "Belum ada semester aktif"}</span></FieldRow>
          <FieldRow label="Mata Kuliah">
            <select name="courseId" className={inputClass} required>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Kelas">
            <select name="name" className={inputClass} defaultValue="A"><option>A</option><option>B</option><option>C</option><option>D</option></select>
          </FieldRow>
          <FieldRow label="Dosen Pengampu">
            <select name="lecturerId" className={inputClass} required>
              {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Status">
            <div className="flex gap-5">
              <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" /> Draft</label>
              <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" defaultChecked /> Aktif</label>
            </div>
          </FieldRow>
        </form>
      </AdminModal>
    )
  }

  return (
    <AdminLayout>
      <AdminSectionHeader title="Manajemen Akademik" />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <AdminPanel className="rounded-t-none p-5">
          <p className="mb-5 border-b border-gray-200 pb-4 text-sm text-gray-600">
            {activeTab === "semester" && "Mengatur periode akademik yang digunakan dalam sistem."}
            {activeTab === "courses" && "Mengatur data mata kuliah yang digunakan dalam sistem."}
            {activeTab === "classes" && "Mengatur kelas praktikum berdasarkan mata kuliah dan semester akademik."}
          </p>

          {loading ? (
            <EmptyState title="Memuat data akademik..." />
          ) : activeTab === "semester" ? (
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
                      <AdminButton
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedSemester(semester)
                          setModal(semester.status === "Aktif" ? "semester" : "activate")
                        }}
                      >
                        {semester.status === "Aktif" ? "Edit" : "Aktifkan"}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          ) : activeTab === "courses" ? (
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Daftar Mata Kuliah</h2>
                <div className="flex flex-wrap gap-3">
                  <AdminButton onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>
                  <AdminSelect value={semesterFilter} onChange={setSemesterFilter} label="Semester">
                    <option value="all">Semua Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="3">Semester 3</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
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
                      <td className="px-4 py-3"><AdminButton variant="ghost" className="h-8 px-2" disabled>{course.status === "Aktif" ? "Edit" : "Aktifkan"}</AdminButton></td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada mata kuliah" action={<AdminButton onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>} />
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Daftar Kelas</h2>
                <div className="flex flex-wrap gap-3">
                  <AdminButton onClick={() => setModal("class")} disabled={!activeSemester || !courses.length || !lecturers.length}><Plus size={16} />Tambah Kelas</AdminButton>
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
