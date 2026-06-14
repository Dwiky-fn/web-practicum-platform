import { Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import {
  AdminActionCell,
  AdminButton,
  AdminConfirmModal,
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
  cloneAdminClass,
  createAdminClass,
  createAdminCourse,
  createAdminSemester,
  deleteAdminClass,
  deleteAdminCourse,
  deleteAdminSemester,
  getAdminClassClonePreview,
  getAdminClassTemplates,
  getAdminClasses,
  getAdminCourses,
  getAdminDepartments,
  getAdminSemesters,
  getAdminUsers,
  updateAdminClass,
  updateAdminCourse,
} from "../../../services/admin/service"
import type {
  AcademicClass,
  AcademicCourse,
  AcademicSemester,
  AdminLecturer,
  AdminTab,
  ClassClonePreview,
  ClassTemplate,
  Department,
} from "../../../services/admin/types"
import {
  getActiveSemester,
  getStudentSemesterOptions,
} from "./semesterOptions"

type ModalMode = "semester" | "course" | "course-edit" | "class" | "class-edit" | "activate" | null
type ConfirmTarget =
  | { type: "semester"; item: AcademicSemester }
  | { type: "course"; item: AcademicCourse }
  | { type: "class"; item: AcademicClass }
type SelectedAcademicIds = Record<AdminTab, string[]>

type CourseFormState = {
  code: string
  name: string
  semester: string
  sks: string
  status: "Aktif" | "Nonaktif" | ""
}

type ClassFormState = {
  courseId: string
  name: string
  lecturerId: string
  programmingLanguage: "java" | "python"
  status: "Aktif" | "Nonaktif" | "Arsip" | ""
}

type ClassCreationMode = "manual" | "template"

type CloneClassFormState = {
  sourceClassId: string
  name: string
  academicPeriodId: string
  lecturerId: string
  programmingLanguage: "java" | "python"
  studyProgramId: string
  generation: string
  className: string
  copyJobsheets: boolean
  autoEnrollStudents: boolean
}

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "semester", label: "Semester" },
  { id: "courses", label: "Mata Kuliah" },
  { id: "classes", label: "Kelas" },
]

export default function AdminAcademicPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const queryTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<AdminTab>(
    queryTab === "courses" || queryTab === "classes"
      ? queryTab
      : location.pathname === "/courses"
      ? "courses"
      : "semester",
  )
  const [keyword, setKeyword] = useState("")
  const [semesterTermFilter, setSemesterTermFilter] = useState("all")
  const [semesterNumberFilter, setSemesterNumberFilter] = useState("all")
  const [classStatusFilter, setClassStatusFilter] = useState("Aktif")
  const [classCourseFilter, setClassCourseFilter] = useState("all")
  const [modal, setModal] = useState<ModalMode>(null)
  const [selectedSemester, setSelectedSemester] = useState<AcademicSemester | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<AcademicCourse | null>(null)
  const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [bulkDeleteTab, setBulkDeleteTab] = useState<AdminTab | null>(null)
  const [classActivationWarning, setClassActivationWarning] = useState(false)
  const [courseForm, setCourseForm] = useState<CourseFormState>({
    code: "",
    name: "",
    semester: "",
    sks: "",
    status: "",
  })
  const [classForm, setClassForm] = useState<ClassFormState>({
    courseId: "",
    name: "",
    lecturerId: "",
    programmingLanguage: "java",
    status: "",
  })
  const [classCreationMode, setClassCreationMode] = useState<ClassCreationMode>("manual")
  const [cloneClassForm, setCloneClassForm] = useState<CloneClassFormState>({
    sourceClassId: "",
    name: "",
    academicPeriodId: "",
    lecturerId: "",
    programmingLanguage: "java",
    studyProgramId: "",
    generation: "",
    className: "",
    copyJobsheets: true,
    autoEnrollStudents: true,
  })
  const [cloneDepartmentId, setCloneDepartmentId] = useState("")
  const [clonePreview, setClonePreview] = useState<ClassClonePreview | null>(null)
  const [templateClasses, setTemplateClasses] = useState<ClassTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [cloneConfirmed, setCloneConfirmed] = useState(false)
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [courses, setCourses] = useState<AcademicCourse[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedAcademicIds, setSelectedAcademicIds] = useState<SelectedAcademicIds>({
    semester: [],
    courses: [],
    classes: [],
  })
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [longPressActive, setLongPressActive] = useState(false)
  const navigate = useNavigate()

  const activeSelectedIds = selectedAcademicIds[activeTab]

  const toggleAcademicSelection = (id: string) => {
    setSelectedAcademicIds((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].includes(id)
        ? prev[activeTab].filter((itemId) => itemId !== id)
        : [...prev[activeTab], id],
    }))
  }

  const handleAcademicMouseDown = (id: string) => {
    setLongPressActive(false)
    const timer = setTimeout(() => {
      setLongPressActive(true)
      toggleAcademicSelection(id)
    }, 600)
    setLongPressTimer(timer)
  }

  const cancelAcademicLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleAcademicMouseUp = (id: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
      if (!longPressActive && activeSelectedIds.length > 0) {
        toggleAcademicSelection(id)
      }
    }
  }

  const stopRowSelection = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const fetchAcademicData = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const [semesterData, courseData, classData, lecturerData, departmentData] = await Promise.all([
        getAdminSemesters(),
        getAdminCourses(),
        getAdminClasses(),
        getAdminUsers("lecturers"),
        getAdminDepartments(),
      ])

      setSemesters(semesterData)
      setCourses(courseData)
      setClasses(classData)
      setLecturers(lecturerData as AdminLecturer[])
      setDepartments(departmentData)
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
      const matchSemesterTerm =
        semesterTermFilter === "all" ||
        (semesterTermFilter === "ganjil" && [1, 3, 5].includes(course.semester)) ||
        (semesterTermFilter === "genap" && [2, 4, 6].includes(course.semester))
      const matchSemesterNumber =
        semesterNumberFilter === "all" || String(course.semester) === semesterNumberFilter
      return matchKeyword && matchSemesterTerm && matchSemesterNumber
    })
  }, [courses, keyword, semesterNumberFilter, semesterTermFilter])

  const filteredClasses = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return classes.filter((item) => {
      const matchKeyword = !normalized ||
        [item.name, item.courseName, item.lecturer].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = classStatusFilter === "all" || item.status === classStatusFilter
      const matchCourse = classCourseFilter === "all" || item.courseId === classCourseFilter
      return matchKeyword && matchStatus && matchCourse
    })
  }, [classes, classCourseFilter, classStatusFilter, keyword])

  const activeSemester = getActiveSemester(semesters)
  const activeSemesterTerm = activeSemester?.term

  useEffect(() => {
    if (!activeSemesterTerm) return

    if (activeSemesterTerm === "Ganjil") {
      setSemesterTermFilter("ganjil")
      return
    }

    setSemesterTermFilter("genap")
  }, [activeSemesterTerm])

  useEffect(() => {
    if (!activeSemester?.id) return
    setCloneClassForm((form) => ({
      ...form,
      academicPeriodId: form.academicPeriodId || activeSemester.id,
    }))
  }, [activeSemester?.id])

  const studentSemesterOptions = useMemo(
    () => getStudentSemesterOptions(activeSemesterTerm),
    [activeSemesterTerm],
  )
  const classCourseOptions = useMemo(
    () => courses.filter((course) =>
      course.status === "Aktif" && studentSemesterOptions.includes(course.semester)
    ),
    [courses, studentSemesterOptions],
  )
  const cloneStudyProgramOptions = useMemo(
    () => departments.find((dept) => dept.id === cloneDepartmentId)?.studyPrograms || [],
    [cloneDepartmentId, departments],
  )
  const selectedTemplateClass = useMemo(
    () => templateClasses.find((item) => item.id === cloneClassForm.sourceClassId),
    [cloneClassForm.sourceClassId, templateClasses],
  )
  const selectedCloneSemester = useMemo(
    () => semesters.find((semester) => semester.id === cloneClassForm.academicPeriodId),
    [cloneClassForm.academicPeriodId, semesters],
  )
  const buildCloneClassName = useCallback((
    template?: ClassTemplate,
    rombel = "",
    semester?: AcademicSemester,
  ) => {
    if (!template) return rombel

    return [
      template.course_name,
      rombel || template.name,
      semester ? `${semester.year} - ${semester.term}` : "",
    ].filter(Boolean).join(" - ")
  }, [])
  const cloneSubmitDisabled = classCreationMode === "template" && (
    templatesLoading ||
    !cloneClassForm.sourceClassId ||
    !cloneClassForm.name.trim() ||
    !cloneClassForm.academicPeriodId ||
    !cloneClassForm.lecturerId ||
    !cloneConfirmed ||
    (
      cloneClassForm.autoEnrollStudents &&
      (!cloneDepartmentId || !cloneClassForm.studyProgramId || !cloneClassForm.generation)
    )
  )
  const addClassDisabledReason = !activeSemester
    ? "Belum ada semester akademik aktif."
    : !classCourseOptions.length
    ? `Belum ada mata kuliah semester ${studentSemesterOptions.join(", ")} untuk semester aktif ${activeSemester.term}.`
    : !lecturers.length
    ? "Belum ada dosen aktif untuk dijadikan pengampu."
    : ""
  const activeSelectionLabel =
    activeTab === "semester" ? "semester" : activeTab === "courses" ? "mata kuliah" : "kelas"
  const closeModal = () => {
    setModal(null)
    setSelectedSemester(null)
    setSelectedCourse(null)
    setSelectedClass(null)
    setClassActivationWarning(false)
    setCourseForm({
      code: "",
      name: "",
      semester: "",
      sks: "",
      status: "",
    })
    setClassForm({
      courseId: "",
      name: "",
      lecturerId: "",
      programmingLanguage: "java",
      status: "",
    })
    setClassCreationMode("manual")
    setCloneClassForm({
      sourceClassId: "",
      name: "",
      academicPeriodId: activeSemester?.id || "",
      lecturerId: "",
      programmingLanguage: "java",
      studyProgramId: "",
      generation: "",
      className: "",
      copyJobsheets: true,
      autoEnrollStudents: true,
    })
    setCloneDepartmentId("")
    setClonePreview(null)
    setCloneConfirmed(false)
  }

  const handleSemesterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startYear = String(form.get("startYear") || "")
    const endYear = String(form.get("endYear") || "")

    try {
      setSubmitting(true)
      setError("")
      await createAdminSemester({
        year: `${startYear}/${endYear}`,
        term: String(form.get("term") || "") as "Ganjil" | "Genap",
        status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan semester")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCourseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      setSubmitting(true)
      setError("")
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
    } finally {
      setSubmitting(false)
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
      setSubmitting(true)
      setError("")
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleActivateCourse = async (course: AcademicCourse) => {
    try {
      setActionLoading(`course-${course.id}`)
      setError("")
      await activateAdminCourse(course.id)
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan mata kuliah")
    } finally {
      setActionLoading("")
    }
  }

  const fetchTemplateClasses = useCallback(async () => {
    try {
      setTemplatesLoading(true)
      setError("")
      const data = await getAdminClassTemplates()
      setTemplateClasses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar kelas template")
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (modal === "class" && classCreationMode === "template" && !templateClasses.length) {
      fetchTemplateClasses()
    }
  }, [classCreationMode, fetchTemplateClasses, modal, templateClasses.length])

  const handleTemplateClassChange = async (classId: string) => {
    const template = templateClasses.find((item) => item.id === classId)
    const department = departments.find((dept) =>
      dept.studyPrograms.some((program) => program.id === template?.study_program_id),
    )

    setCloneClassForm((form) => ({
      ...form,
      sourceClassId: classId,
      name: buildCloneClassName(template, template?.name || form.className, selectedCloneSemester) || form.name,
      lecturerId: template?.lecturer_id || form.lecturerId,
      programmingLanguage: template?.programming_language || "java",
      studyProgramId: template?.study_program_id || form.studyProgramId,
      className: template?.name || form.className,
    }))
    setCloneDepartmentId(department?.id || "")
    setClonePreview(null)
    setCloneConfirmed(false)

    if (!classId) return

    try {
      setTemplatesLoading(true)
      setError("")
      setClonePreview(await getAdminClassClonePreview(classId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat preview duplikasi kelas")
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      setSubmitting(true)
      setError("")
      setSuccess("")
      await createAdminClass({
        courseId: String(form.get("courseId") || ""),
        name: String(form.get("name") || ""),
        lecturerId: String(form.get("lecturerId") || ""),
        academicPeriodId: activeSemester?.id,
        programmingLanguage: String(form.get("programmingLanguage") || "java") as "java" | "python",
        status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
      })
      closeModal()
      setSuccess("Kelas berhasil ditambahkan.")
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kelas")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloneClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!cloneClassForm.sourceClassId) {
      setError("Kelas sumber wajib dipilih")
      return
    }

    if (cloneClassForm.autoEnrollStudents && (!cloneClassForm.studyProgramId || !cloneClassForm.generation)) {
      setError("Program studi dan angkatan wajib diisi untuk auto enroll mahasiswa")
      return
    }

    if (!cloneConfirmed) {
      setError("Konfirmasi preview duplikasi kelas terlebih dahulu")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      setSuccess("")
      const result = await cloneAdminClass({
        source_class_id: cloneClassForm.sourceClassId,
        name: cloneClassForm.name,
        academic_period_id: cloneClassForm.academicPeriodId || activeSemester?.id,
        study_program_id: cloneClassForm.studyProgramId,
        generation: cloneClassForm.generation ? Number(cloneClassForm.generation) : undefined,
        class_name: cloneClassForm.className,
        lecturer_id: cloneClassForm.lecturerId,
        programming_language: cloneClassForm.programmingLanguage,
        copy_jobsheets: cloneClassForm.copyJobsheets,
        auto_enroll_students: cloneClassForm.autoEnrollStudents,
      })

      closeModal()
      setSuccess(
        result.students_added === 0 && cloneClassForm.autoEnrollStudents
          ? `Kelas berhasil dibuat dari template. Jobsheet disalin: ${result.jobsheets_copied}. Tidak ada mahasiswa yang sesuai dengan filter.`
          : `Kelas berhasil dibuat dari template. Mahasiswa ditambahkan: ${result.students_added}. Jobsheet disalin: ${result.jobsheets_copied}.`,
      )
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kelas dari template")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditClass = (classItem: AcademicClass) => {
    setSelectedClass(classItem)
    setClassForm({
      courseId: classItem.courseId,
      name: classItem.name,
      lecturerId: classItem.lecturerId,
      programmingLanguage: classItem.programmingLanguage || "java",
      status: classItem.status === "Arsip" ? "Arsip" : classItem.status === "Aktif" ? "Aktif" : "Nonaktif",
    })
    setModal("class-edit")
  }

  const handleClassEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedClass) return
    const selectedCourseForClass = courses.find((course) => course.id === classForm.courseId)

    if (
      classForm.status === "Aktif" &&
      selectedCourseForClass &&
      !studentSemesterOptions.includes(selectedCourseForClass.semester)
    ) {
      setClassActivationWarning(true)
      return
    }

    try {
      setSubmitting(true)
      setError("")
      await updateAdminClass(selectedClass.id, {
        courseId: classForm.courseId,
        name: classForm.name,
        lecturerId: classForm.lecturerId,
        programmingLanguage: classForm.programmingLanguage,
        status: classForm.status as "Aktif" | "Nonaktif" | "Arsip",
      })
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui kelas")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!confirmTarget) return

    try {
      setActionLoading(`delete-${confirmTarget.type}-${confirmTarget.item.id}`)
      setError("")

      if (confirmTarget.type === "semester") {
        await deleteAdminSemester(confirmTarget.item.id)
      } else if (confirmTarget.type === "course") {
        await deleteAdminCourse(confirmTarget.item.id)
      } else {
        await deleteAdminClass(confirmTarget.item.id)
      }

      setConfirmTarget(null)
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data")
    } finally {
      setActionLoading("")
    }
  }

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTab) return
    const ids = selectedAcademicIds[bulkDeleteTab]
    if (!ids.length) return

    try {
      setActionLoading(`bulk-delete-${bulkDeleteTab}`)
      setError("")

      if (bulkDeleteTab === "semester") {
        await Promise.all(ids.map((id) => deleteAdminSemester(id)))
      } else if (bulkDeleteTab === "courses") {
        await Promise.all(ids.map((id) => deleteAdminCourse(id)))
      } else {
        await Promise.all(ids.map((id) => deleteAdminClass(id)))
      }

      setSelectedAcademicIds((prev) => ({
        ...prev,
        [bulkDeleteTab]: [],
      }))
      setBulkDeleteTab(null)
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data terpilih")
    } finally {
      setActionLoading("")
    }
  }

  const handleActivateSemester = async () => {
    if (!selectedSemester) return

    try {
      setSubmitting(true)
      setError("")
      await activateAdminSemester(selectedSemester.id)
      closeModal()
      fetchAcademicData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan semester")
    } finally {
      setSubmitting(false)
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
              <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton onClick={handleActivateSemester} disabled={submitting}>
                {submitting ? "Mengaktifkan..." : "Aktifkan"}
              </AdminButton>
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
              <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-semester-form" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Tambah"}
              </AdminButton>
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
              <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-course-form" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Tambah"}
              </AdminButton>
            </>
          }
        >
          <form id="admin-course-form" className="space-y-4" onSubmit={handleCourseSubmit}>
            <FieldRow label="Kode MK"><input name="code" className={inputClass} placeholder="Masukkan kode mata kuliah" required /></FieldRow>
            <FieldRow label="Mata Kuliah"><input name="name" className={inputClass} placeholder="Masukkan nama mata kuliah" required /></FieldRow>
            <FieldRow label="Semester Mahasiswa">
              <select name="semester" className={inputClass} required>
                <option value="" disabled>Pilih semester</option>
                {[1, 2, 3, 4, 5, 6].map((option) => (
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
              <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-course-edit-form" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </AdminButton>
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

    if (modal === "class-edit") {
      return (
        <AdminModal
          title="Edit Kelas"
          onClose={closeModal}
          footer={
            <>
              <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-class-edit-form" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </AdminButton>
            </>
          }
        >
          <form id="admin-class-edit-form" className="space-y-4" onSubmit={handleClassEditSubmit}>
            <FieldRow label="Semester Akademik"><span className="text-sm font-semibold">{selectedClass?.semesterYear}</span></FieldRow>
            <FieldRow label="Mata Kuliah">
              <select
                name="courseId"
                className={inputClass}
                value={classForm.courseId}
                onChange={(event) => setClassForm((form) => ({ ...form, courseId: event.target.value }))}
                required
              >
                <option value="" disabled>Pilih mata kuliah</option>
                {classCourseOptions.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Kelas">
              <select
                name="name"
                className={inputClass}
                value={classForm.name}
                onChange={(event) => setClassForm((form) => ({ ...form, name: event.target.value }))}
                required
              >
                <option value="" disabled>Pilih kelas</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
                <option>E</option>
              </select>
            </FieldRow>
            <FieldRow label="Dosen Pengampu">
              <select
                name="lecturerId"
                className={inputClass}
                value={classForm.lecturerId}
                onChange={(event) => setClassForm((form) => ({ ...form, lecturerId: event.target.value }))}
                required
              >
                <option value="" disabled>Pilih dosen pengampu</option>
                {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Bahasa Pemrograman">
              <select
                name="programmingLanguage"
                className={inputClass}
                value={classForm.programmingLanguage}
                onChange={(event) => setClassForm((form) => ({
                  ...form,
                  programmingLanguage: event.target.value as "java" | "python",
                }))}
                required
              >
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </FieldRow>
            <FieldRow label="Status">
              <div className="flex gap-5">
                {(["Nonaktif", "Aktif", "Arsip"] as const).map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={classForm.status === status}
                      onChange={() => setClassForm((form) => ({ ...form, status }))}
                      required
                    />
                    {status}
                  </label>
                ))}
              </div>
            </FieldRow>
          </form>
        </AdminModal>
      )
    }

    return (
      <AdminModal
        title={classCreationMode === "template" ? "Buat Kelas dari Template" : "Tambah Kelas"}
        description={classCreationMode === "template" ? "Pilih kelas sebelumnya sebagai template untuk membuat kelas baru." : undefined}
        onClose={closeModal}
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeModal} disabled={submitting}>Batal</AdminButton>
            <AdminButton
              type="submit"
              form={classCreationMode === "manual" ? "admin-class-form" : "admin-class-clone-form"}
              disabled={submitting || cloneSubmitDisabled}
            >
              {submitting ? "Menyimpan..." : classCreationMode === "manual" ? "Tambah" : "Buat Kelas"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-3">
          <FieldRow label="Metode Pembuatan">
            <div className="grid overflow-hidden rounded-md border border-gray-300 bg-white text-sm sm:inline-grid sm:grid-cols-2">
              <button
                type="button"
                className={`px-4 py-2 font-semibold ${classCreationMode === "manual" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                onClick={() => {
                  setClassCreationMode("manual")
                  setCloneConfirmed(false)
                  setError("")
                }}
              >
                Manual
              </button>
              <button
                type="button"
                className={`px-4 py-2 font-semibold ${classCreationMode === "template" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                onClick={() => {
                  setClassCreationMode("template")
                  setError("")
                  fetchTemplateClasses()
                }}
              >
                Dari Kelas Sebelumnya
              </button>
            </div>
          </FieldRow>

          {classCreationMode === "manual" ? (
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
                  <option>E</option>
                </select>
              </FieldRow>
              <FieldRow label="Dosen Pengampu">
                <select name="lecturerId" className={inputClass} required>
                  <option value="" disabled>Pilih dosen pengampu</option>
                  {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Bahasa Pemrograman">
                <select name="programmingLanguage" className={inputClass} defaultValue="java" required>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </FieldRow>
              <FieldRow label="Status">
                <div className="flex gap-5">
                  <label className="flex items-center gap-2"><input type="radio" name="status" value="Nonaktif" required /> Nonaktif</label>
                  <label className="flex items-center gap-2"><input type="radio" name="status" value="Aktif" /> Aktif</label>
                  <label className="flex items-center gap-2"><input type="radio" name="status" value="Arsip" /> Arsip</label>
                </div>
              </FieldRow>
            </form>
          ) : (
            <form id="admin-class-clone-form" className="space-y-3" onSubmit={handleCloneClassSubmit}>
              <FieldRow label="Kelas Sumber">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.sourceClassId}
                  onChange={(event) => handleTemplateClassChange(event.target.value)}
                  required
                >
                  <option value="" disabled>{templatesLoading ? "Memuat template..." : "Pilih kelas sumber"}</option>
                  {templateClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.course_name} - {item.name} - {item.academic_year}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Kelas/Rombel">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.className}
                  onChange={(event) => {
                    const rombel = event.target.value
                    setCloneClassForm((form) => ({
                      ...form,
                      className: rombel,
                      name: buildCloneClassName(selectedTemplateClass, rombel, selectedCloneSemester),
                    }))
                  }}
                  required
                >
                  <option value="" disabled>Pilih kelas</option>
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>D</option>
                  <option>E</option>
                </select>
              </FieldRow>
              <FieldRow label="Nama Kelas Baru">
                <input
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.name}
                  onChange={(event) => setCloneClassForm((form) => ({ ...form, name: event.target.value }))}
                  placeholder="Nama kelas lengkap"
                  required
                />
              </FieldRow>
              <FieldRow label="Tahun Akademik">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.academicPeriodId}
                  onChange={(event) => {
                    const academicPeriodId = event.target.value
                    const semester = semesters.find((item) => item.id === academicPeriodId)
                    setCloneClassForm((form) => ({
                      ...form,
                      academicPeriodId,
                      name: buildCloneClassName(selectedTemplateClass, form.className, semester),
                    }))
                  }}
                  required
                >
                  <option value="" disabled>Pilih tahun akademik</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>{semester.year} - {semester.term}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Dosen Pengampu">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.lecturerId}
                  onChange={(event) => setCloneClassForm((form) => ({ ...form, lecturerId: event.target.value }))}
                  required
                >
                  <option value="" disabled>Pilih dosen pengampu</option>
                  {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Bahasa Pemrograman">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.programmingLanguage}
                  onChange={(event) => setCloneClassForm((form) => ({
                    ...form,
                    programmingLanguage: event.target.value as "java" | "python",
                  }))}
                  required
                >
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </FieldRow>
              <FieldRow label="Jurusan">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneDepartmentId}
                  onChange={(event) => {
                    setCloneDepartmentId(event.target.value)
                    setCloneClassForm((form) => ({ ...form, studyProgramId: "" }))
                  }}
                  required={cloneClassForm.autoEnrollStudents}
                >
                  <option value="" disabled>Pilih jurusan</option>
                  {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Program Studi">
                <select
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.studyProgramId}
                  onChange={(event) => setCloneClassForm((form) => ({ ...form, studyProgramId: event.target.value }))}
                  required={cloneClassForm.autoEnrollStudents}
                  disabled={!cloneDepartmentId}
                >
                  <option value="" disabled>{cloneDepartmentId ? "Pilih program studi" : "Pilih jurusan terlebih dahulu"}</option>
                  {cloneStudyProgramOptions.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Angkatan">
                <input
                  className={`${inputClass} w-full`}
                  value={cloneClassForm.generation}
                  onChange={(event) => setCloneClassForm((form) => ({ ...form, generation: event.target.value }))}
                  placeholder="2026"
                  required={cloneClassForm.autoEnrollStudents}
                />
              </FieldRow>
              <FieldRow label="Opsi Duplikasi">
                <div className="grid gap-2">
                  <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={cloneClassForm.copyJobsheets}
                      onChange={(event) => setCloneClassForm((form) => ({ ...form, copyJobsheets: event.target.checked }))}
                    />
                    <span>
                      <span className="block font-semibold text-gray-800">Salin jobsheet dari kelas sumber</span>
                      <span className="block text-xs font-normal text-gray-500">Jobsheet dan struktur praktikum akan disalin ke kelas baru.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={cloneClassForm.autoEnrollStudents}
                      onChange={(event) => setCloneClassForm((form) => ({ ...form, autoEnrollStudents: event.target.checked }))}
                    />
                    <span>
                      <span className="block font-semibold text-gray-800">Masukkan mahasiswa otomatis</span>
                      <span className="block text-xs font-normal text-gray-500">Mahasiswa diambil berdasarkan program studi, angkatan, dan rombel.</span>
                    </span>
                  </label>
                </div>
              </FieldRow>
              {templatesLoading && (
                <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Memuat data template...
                </div>
              )}
              {clonePreview && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Preview Duplikasi</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-white p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">Kelas Sumber</p>
                      <p className="mt-1 font-semibold text-gray-900">{clonePreview.source_class.course_name} - {clonePreview.source_class.name}</p>
                      <p className="text-xs text-gray-500">{clonePreview.source_class.academic_year}</p>
                      <p className="mt-1 text-xs text-gray-500">Bahasa: {clonePreview.source_class.programming_language_display_name}</p>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">Kelas Baru</p>
                      <p className="mt-1 font-semibold text-gray-900">{cloneClassForm.name || "-"}</p>
                      <p className="text-xs text-gray-500">
                        {selectedCloneSemester ? `${selectedCloneSemester.year} - ${selectedCloneSemester.term}` : "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Bahasa: {cloneClassForm.programmingLanguage === "python" ? "Python" : "Java"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-white p-3">
                      <p className="font-semibold text-gray-900">Yang akan disalin</p>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>Mata kuliah</li>
                        <li>Dosen pengampu</li>
                        <li>Pengaturan praktikum</li>
                        <li>Jobsheet: {cloneClassForm.copyJobsheets ? clonePreview.copyable_data.jobsheets : 0}</li>
                      </ul>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <p className="font-semibold text-gray-900">Yang tidak disalin</p>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>Mahasiswa kelas lama</li>
                        <li>Submission, nilai, feedback</li>
                        <li>Progress mahasiswa</li>
                        <li>Riwayat eksekusi kode</li>
                      </ul>
                    </div>
                  </div>
                  <label className="mt-3 flex items-start gap-2 border-t border-gray-200 pt-3 text-xs">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={cloneConfirmed}
                      onChange={(event) => setCloneConfirmed(event.target.checked)}
                      required
                    />
                    <span>Saya sudah memeriksa preview dan memahami bahwa aktivitas mahasiswa lama tidak akan disalin.</span>
                  </label>
                </div>
              )}
            </form>
          )}
        </div>
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
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
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
              <AdminTable headers={selectedAcademicIds.semester.length > 0 ? ["", "Tahun Ajaran", "Semester", "Status", "Aksi"] : ["Tahun Ajaran", "Semester", "Status", "Aksi"]}>
                {semesters.map((semester) => (
                  <tr
                    key={semester.id}
                    className={`${selectedAcademicIds.semester.includes(semester.id) ? "bg-blue-50/40" : ""} cursor-default select-none`}
                    onMouseDown={() => handleAcademicMouseDown(semester.id)}
                    onMouseUp={() => handleAcademicMouseUp(semester.id)}
                    onMouseLeave={cancelAcademicLongPress}
                    onTouchStart={() => handleAcademicMouseDown(semester.id)}
                    onTouchEnd={() => handleAcademicMouseUp(semester.id)}
                  >
                    {selectedAcademicIds.semester.length > 0 && (
                      <td
                        className="px-4 py-3 text-center"
                        onMouseDown={stopRowSelection}
                        onClick={stopRowSelection}
                        onTouchStart={stopRowSelection}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedAcademicIds.semester.includes(semester.id)}
                          onChange={() => toggleAcademicSelection(semester.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">{semester.year}</td>
                    <td className="px-4 py-3">{semester.term}</td>
                    <td className="px-4 py-3">{semester.status}</td>
                    <AdminActionCell>
                      <AdminButton
                        variant="ghost"
                        className="h-8 px-2"
                        disabled={submitting}
                        onMouseDown={stopRowSelection}
                        onTouchStart={stopRowSelection}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedSemester(semester)
                          setModal(semester.status === "Aktif" ? "semester" : "activate")
                        }}
                      >
                        {semester.status === "Aktif" ? "Edit" : "Aktifkan"}
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        className="h-8 px-2"
                        disabled={Boolean(actionLoading) || semester.status === "Aktif"}
                        onMouseDown={stopRowSelection}
                        onTouchStart={stopRowSelection}
                        onClick={(event) => {
                          event.stopPropagation()
                          setConfirmTarget({ type: "semester", item: semester })
                        }}
                      >
                        Hapus
                      </AdminButton>
                    </AdminActionCell>
                  </tr>
                ))}
              </AdminTable>
            </div>
          ) : activeTab === "courses" ? (
            <div>
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h2 className="shrink-0 text-lg font-semibold whitespace-nowrap">Daftar Mata Kuliah</h2>
                <div className="flex w-full min-w-0 flex-wrap justify-start gap-3 xl:w-auto xl:flex-nowrap xl:justify-end">
                  <AdminButton className="shrink-0 px-3" onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>
                  <AdminSelect
                    value={semesterTermFilter}
                    onChange={setSemesterTermFilter}
                    label="Jenis semester"
                    className="w-full sm:w-40"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                  </AdminSelect>
                  <AdminSelect
                    value={semesterNumberFilter}
                    onChange={setSemesterNumberFilter}
                    label="Semester"
                    className="w-full sm:w-44"
                  >
                    <option value="all">Semua Semester</option>
                    {[1, 2, 3, 4, 5, 6].map((option) => (
                      <option key={option} value={option}>Semester {option}</option>
                    ))}
                  </AdminSelect>
                  <AdminSearchInput
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="Cari Mata Kuliah"
                    className="sm:w-44 xl:w-40"
                  />
                </div>
              </div>

              {filteredCourses.length ? (
                <AdminTable headers={selectedAcademicIds.courses.length > 0 ? ["", "Kode MK", "Mata Kuliah", "Semester", "SKS", "Status", "Aksi"] : ["Kode MK", "Mata Kuliah", "Semester", "SKS", "Status", "Aksi"]}>
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className={`${selectedAcademicIds.courses.includes(course.id) ? "bg-blue-50/40" : ""} cursor-default select-none`}
                      onMouseDown={() => handleAcademicMouseDown(course.id)}
                      onMouseUp={() => handleAcademicMouseUp(course.id)}
                      onMouseLeave={cancelAcademicLongPress}
                      onTouchStart={() => handleAcademicMouseDown(course.id)}
                      onTouchEnd={() => handleAcademicMouseUp(course.id)}
                    >
                      {selectedAcademicIds.courses.length > 0 && (
                        <td
                          className="px-4 py-3 text-center"
                          onMouseDown={stopRowSelection}
                          onClick={stopRowSelection}
                          onTouchStart={stopRowSelection}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedAcademicIds.courses.includes(course.id)}
                            onChange={() => toggleAcademicSelection(course.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono">{course.code}</td>
                      <td className="px-4 py-3">{course.name}</td>
                      <td className="px-4 py-3">{course.semester}</td>
                      <td className="px-4 py-3">{course.sks}</td>
                      <td className="px-4 py-3">{course.status}</td>
                      <AdminActionCell>
                      <AdminButton
                        variant="ghost"
                        className="h-8 px-2"
                        disabled={Boolean(actionLoading)}
                        onMouseDown={stopRowSelection}
                        onTouchStart={stopRowSelection}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditCourse(course)
                        }}
                      >
                          Edit
                        </AdminButton>
                        {course.status !== "Aktif" && (
                          <AdminButton
                            variant="ghost"
                            className="h-8 px-2"
                            disabled={Boolean(actionLoading)}
                            onMouseDown={stopRowSelection}
                            onTouchStart={stopRowSelection}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleActivateCourse(course)
                            }}
                          >
                            {actionLoading === `course-${course.id}` ? "Memproses..." : "Aktifkan"}
                          </AdminButton>
                        )}
                        <AdminButton
                          variant="danger"
                          className="h-8 px-2"
                          disabled={Boolean(actionLoading)}
                          onMouseDown={stopRowSelection}
                          onTouchStart={stopRowSelection}
                          onClick={(event) => {
                            event.stopPropagation()
                            setConfirmTarget({ type: "course", item: course })
                          }}
                        >
                          Hapus
                        </AdminButton>
                      </AdminActionCell>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada mata kuliah" action={<AdminButton onClick={() => setModal("course")}><Plus size={16} />Tambah Mata Kuliah</AdminButton>} />
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h2 className="shrink-0 text-lg font-semibold whitespace-nowrap">Daftar Kelas</h2>
                <div className="flex w-full min-w-0 flex-wrap justify-start gap-3 xl:w-auto xl:flex-nowrap xl:justify-end">
                  <AdminButton
                    className="shrink-0 px-3"
                    onClick={() => setModal("class")}
                    disabled={Boolean(addClassDisabledReason)}
                    title={addClassDisabledReason || "Tambah Kelas"}
                  >
                    <Plus size={16} />
                    Tambah Kelas
                  </AdminButton>
                  <AdminSelect
                    value={classStatusFilter}
                    onChange={setClassStatusFilter}
                    label="Status"
                    className="w-full sm:w-40"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Arsip">Arsip</option>
                  </AdminSelect>
                  <AdminSelect
                    value={classCourseFilter}
                    onChange={setClassCourseFilter}
                    label="Mata kuliah"
                    className="w-full sm:w-72 xl:w-64"
                  >
                    <option value="all">Semua Mata Kuliah</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </AdminSelect>
                  <AdminSearchInput
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="Cari Kelas"
                    className="sm:w-44 xl:w-40"
                  />
                </div>
              </div>
              {addClassDisabledReason && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {addClassDisabledReason}
                </div>
              )}

              {filteredClasses.length ? (
                <AdminTable headers={selectedAcademicIds.classes.length > 0 ? ["", "Kelas", "Mata Kuliah", "Dosen", "Bahasa", "Status", "Aksi"] : ["Kelas", "Mata Kuliah", "Dosen", "Bahasa", "Status", "Aksi"]}>
                  {filteredClasses.map((item) => (
                    <tr
                      key={item.id}
                      className={`${selectedAcademicIds.classes.includes(item.id) ? "bg-blue-50/40" : ""} cursor-default select-none`}
                      onMouseDown={() => handleAcademicMouseDown(item.id)}
                      onMouseUp={() => handleAcademicMouseUp(item.id)}
                      onMouseLeave={cancelAcademicLongPress}
                      onTouchStart={() => handleAcademicMouseDown(item.id)}
                      onTouchEnd={() => handleAcademicMouseUp(item.id)}
                    >
                      {selectedAcademicIds.classes.length > 0 && (
                        <td
                          className="px-4 py-3 text-center"
                          onMouseDown={stopRowSelection}
                          onClick={stopRowSelection}
                          onTouchStart={stopRowSelection}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedAcademicIds.classes.includes(item.id)}
                            onChange={() => toggleAcademicSelection(item.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.courseName}</td>
                      <td className="px-4 py-3">{item.lecturer}</td>
                      <td className="px-4 py-3">{item.programmingLanguageDisplayName || "Java"}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <AdminActionCell>
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2"
                          onMouseDown={stopRowSelection}
                          onTouchStart={stopRowSelection}
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/classes/${item.id}`)
                          }}
                        >
                          Detail
                        </AdminButton>
                        <AdminButton
                          variant="ghost"
                          className="h-8 px-2"
                          onMouseDown={stopRowSelection}
                          onTouchStart={stopRowSelection}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEditClass(item)
                          }}
                        >
                          Edit
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          className="h-8 px-3"
                          disabled={Boolean(actionLoading)}
                          onMouseDown={stopRowSelection}
                          onTouchStart={stopRowSelection}
                          onClick={(event) => {
                            event.stopPropagation()
                            setConfirmTarget({ type: "class", item })
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
      {activeSelectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-6 rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-2xl animate-in slide-in-from-bottom duration-300">
          <span className="text-sm font-semibold text-slate-300">
            Terpilih <span className="ml-1 rounded-md bg-slate-800 px-2 py-1 font-bold text-white">{activeSelectedIds.length}</span>
          </span>
          <div className="flex gap-2">
            <AdminButton
              variant="secondary"
              className="h-9 border-slate-700 bg-slate-800 px-3 text-white hover:bg-slate-700"
              onClick={() => setSelectedAcademicIds((prev) => ({ ...prev, [activeTab]: [] }))}
            >
              Batal
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-9 px-3"
              disabled={Boolean(actionLoading)}
              onClick={() => setBulkDeleteTab(activeTab)}
            >
              Hapus Terpilih
            </AdminButton>
          </div>
        </div>
      )}
      {classActivationWarning && (
        <AdminModal
          title="Kelas Tidak Bisa Diaktifkan"
          onClose={() => setClassActivationWarning(false)}
          footer={<AdminButton onClick={() => setClassActivationWarning(false)}>Mengerti</AdminButton>}
        >
          <p className="text-center text-sm text-gray-700">
            Kelas hanya bisa diaktifkan jika mata kuliahnya berada pada semester mahasiswa yang sesuai dengan semester akademik aktif.
          </p>
        </AdminModal>
      )}
      {confirmTarget && (
        <AdminConfirmModal
          title={
            confirmTarget.type === "semester"
              ? "Hapus Semester?"
              : confirmTarget.type === "course"
              ? "Hapus Mata Kuliah?"
              : "Hapus Kelas?"
          }
          message={
            confirmTarget.type === "semester"
              ? `Semester ${confirmTarget.item.year} - ${confirmTarget.item.term} akan dihapus.`
              : confirmTarget.type === "course"
              ? `Mata kuliah ${confirmTarget.item.name} akan dihapus.`
              : `Kelas ${confirmTarget.item.name} - ${confirmTarget.item.courseName} akan dihapus.`
          }
          confirmLabel="Hapus"
          variant="danger"
          loading={actionLoading === `delete-${confirmTarget.type}-${confirmTarget.item.id}`}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {bulkDeleteTab && (
        <AdminConfirmModal
          title={`Hapus ${selectedAcademicIds[bulkDeleteTab].length} ${activeSelectionLabel} terpilih?`}
          message="Data yang sudah dihapus tidak dapat dikembalikan."
          confirmLabel="Hapus"
          cancelLabel="Batal"
          variant="danger"
          loading={Boolean(actionLoading)}
          onCancel={() => setBulkDeleteTab(null)}
          onConfirm={handleBulkDeleteConfirm}
        />
      )}
    </AdminLayout>
  )
}
