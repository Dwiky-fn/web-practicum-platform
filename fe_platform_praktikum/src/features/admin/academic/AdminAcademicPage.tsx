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
  activateAdminCourse,
  activateAdminSemester,
  createAdminClass,
  createAdminCourse,
  createAdminSemester,
  getAdminClasses,
  getAdminCourses,
  getAdminSemesters,
  getAdminUsers,
  updateAdminCourse,
} from "../../../services/admin/service"
import type {
  AcademicClass,
  AcademicCourse,
  AcademicSemester,
  AdminLecturer,
  AdminTab,
} from "../../../services/admin/types"
import {
  getActiveSemester,
  getStudentSemesterOptions,
} from "./semesterOptions"

type ModalMode = "semester" | "course" | "course-edit" | "class" | "activate" | null

type CourseFormState = {
  code: string
  name: string
  semester: string
  sks: string
  status: "Aktif" | "Nonaktif" | ""
}

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
  const [selectedCourse, setSelectedCourse] = useState<AcademicCourse | null>(null)
  const [courseForm, setCourseForm] = useState<CourseFormState>({
    code: "",
    name: "",
    semester: "",
    sks: "",
    status: "",
  })
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

  const activeSemester = getActiveSemester(semesters)
  const studentSemesterOptions = useMemo(
    () => getStudentSemesterOptions(activeSemester?.term),
    [activeSemester?.term],
  )
  const classCourseOptions = useMemo(
    () => courses.filter((course) => studentSemesterOptions.includes(course.semester)),
    [courses, studentSemesterOptions],
  )
  const addClassDisabledReason = !activeSemester
    ? "Belum ada semester akademik aktif."
    : !classCourseOptions.length
    ? `Belum ada mata kuliah semester ${studentSemesterOptions.join(", ")} untuk semester aktif ${activeSemester.term}.`
    : !lecturers.length
    ? "Belum ada dosen aktif untuk dijadikan pengampu."
    : ""
  const closeModal = () => {
    setModal(null)
    setSelectedSemester(null)
    setSelectedCourse(null)
    setCourseForm({
      code: "",
      name: "",
      semester: "",
      sks: "",
      status: "",
    })
  }

  useEffect(() => {
    if (semesterFilter !== "all" && !studentSemesterOptions.includes(Number(semesterFilter))) {
      setSemesterFilter("all")
    }
  }, [semesterFilter, studentSemesterOptions])

  const handleSemesterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startYear = String(form.get("startYear") || "")
    const endYear = String(form.get("endYear") || "")

    try {
      await createAdminSemester({
        year: `${startYear}/${endYear}`,
        term: String(form.get("term") || "") as "Ganjil" | "Genap",
        status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
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
        status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan mata kuliah")
    }
  }

  const openEditCourse = (course: AcademicCourse) => {
    setSelectedCourse(course)
    setCourseForm({
      code: course.code,
      name: course.name,
      semester: String(course.semester),
      sks: String(course.sks),
      status: course.status,
    })
    setModal("course-edit")
  }

  const handleCourseEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCourse) return

    try {
      await updateAdminCourse(selectedCourse.id, {
        code: courseForm.code,
        name: courseForm.name,
        semester: Number(courseForm.semester),
        sks: Number(courseForm.sks),
        status: courseForm.status as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui mata kuliah")
    }
  }

  const handleActivateCourse = async (course: AcademicCourse) => {
    try {
      await activateAdminCourse(course.id)
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan mata kuliah")
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
        status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
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
                <input name="startYear" className={`${inputClass} w-28`} placeholder="2025" required />
                <span>/</span>
                <input name="endYear" className={`${inputClass} w-28`} placeholder="2026" required />
              </div>
            </FieldRow>
            <FieldRow label="Semester">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="term" value="Genap" required /> Genap</label>
                <label className="flex items-center gap-2"><input type="radio" name="term" value="Ganjil" /> Ganjil</label>
              </div>
            </FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" required /> Aktif</label>
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
            <FieldRow label="Kode MK"><input name="code" className={inputClass} placeholder="Masukkan kode mata kuliah" required /></FieldRow>
            <FieldRow label="Mata Kuliah"><input name="name" className={inputClass} placeholder="Masukkan nama mata kuliah" required /></FieldRow>
            <FieldRow label="Semester Mahasiswa">
              <select name="semester" className={inputClass} required>
                <option value="" disabled>Pilih semester</option>
                {studentSemesterOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Jumlah SKS"><input name="sks" className={inputClass} placeholder="Masukkan jumlah SKS" required /></FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" required /> Aktif</label>
                <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" /> Nonaktif</label>
              </div>
            </FieldRow>
          </form>
        </AdminModal>
      )
    }

    if (modal === "course-edit") {
      return (
        <AdminModal
          title="Edit Mata Kuliah"
          onClose={closeModal}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-course-edit-form">Simpan</AdminButton>
            </>
          }
        >
          <form id="admin-course-edit-form" className="space-y-4" onSubmit={handleCourseEditSubmit}>
            <FieldRow label="Kode MK">
              <input
                name="code"
                className={inputClass}
                value={courseForm.code}
                onChange={(event) => setCourseForm((form) => ({ ...form, code: event.target.value }))}
                placeholder="Masukkan kode mata kuliah"
                required
              />
            </FieldRow>
            <FieldRow label="Mata Kuliah">
              <input
                name="name"
                className={inputClass}
                value={courseForm.name}
                onChange={(event) => setCourseForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="Masukkan nama mata kuliah"
                required
              />
            </FieldRow>
            <FieldRow label="Semester Mahasiswa">
              <select
                name="semester"
                className={inputClass}
                value={courseForm.semester}
                onChange={(event) => setCourseForm((form) => ({ ...form, semester: event.target.value }))}
                required
              >
                <option value="" disabled>Pilih semester</option>
                {[1, 2, 3, 4, 5, 6].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Jumlah SKS">
              <input
                name="sks"
                className={inputClass}
                value={courseForm.sks}
                onChange={(event) => setCourseForm((form) => ({ ...form, sks: event.target.value }))}
                placeholder="Masukkan jumlah SKS"
                required
              />
            </FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="Aktif"
                    checked={courseForm.status === "Aktif"}
                    onChange={() => setCourseForm((form) => ({ ...form, status: "Aktif" }))}
                    required
                  />
                  Aktif
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="Nonaktif"
                    checked={courseForm.status === "Nonaktif"}
                    onChange={() => setCourseForm((form) => ({ ...form, status: "Nonaktif" }))}
                  />
                  Nonaktif
                </label>
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
              <option value="" disabled>Pilih mata kuliah</option>
              {classCourseOptions.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Kelas">
            <select name="name" className={inputClass} required>
              <option value="" disabled>Pilih kelas</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
            </select>
          </FieldRow>
          <FieldRow label="Dosen Pengampu">
            <select name="lecturerId" className={inputClass} required>
              <option value="" disabled>Pilih dosen pengampu</option>
              {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Status">
            <div className="flex gap-5">
              <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" required /> Draft</label>
              <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" /> Aktif</label>
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
                    {studentSemesterOptions.map((option) => (
                      <option key={option} value={option}>Semester {option}</option>
                    ))}
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
                      <td className="px-4 py-3">
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => {
                            if (course.status === "Aktif") {
                              openEditCourse(course)
                              return
                            }

                            handleActivateCourse(course)
                          }}
                        >
                          {course.status === "Aktif" ? "Edit" : "Aktifkan"}
                        </AdminButton>
                      </td>
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
                  <AdminButton
                    onClick={() => setModal("class")}
                    disabled={Boolean(addClassDisabledReason)}
                    title={addClassDisabledReason || "Tambah Kelas"}
                  >
                    <Plus size={16} />
                    Tambah Kelas
                  </AdminButton>
                  <AdminSelect value={statusFilter} onChange={setStatusFilter} label="Status">
                    <option value="all">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </AdminSelect>
                  <AdminSearchInput value={keyword} onChange={setKeyword} placeholder="Cari Kelas" />
                </div>
              </div>
              {addClassDisabledReason && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {addClassDisabledReason}
                </div>
              )}

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
                <EmptyState
                  title="Belum ada kelas pada semester ini"
                  action={
                    <AdminButton
                      onClick={() => setModal("class")}
                      disabled={Boolean(addClassDisabledReason)}
                      title={addClassDisabledReason || "Tambah Kelas"}
                    >
                      <Plus size={16} />
                      Tambah Kelas
                    </AdminButton>
                  }
                />
              )}
            </div>
          )}
        </AdminPanel>
      </div>

      {renderModal()}
    </AdminLayout>
  )
}
