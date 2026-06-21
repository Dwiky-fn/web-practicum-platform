import { ChevronDown, FileUp, Plus, Trash2, UserCheck, UserX } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import * as XLSX from "xlsx"
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
  getAdminDepartments,
} from "../../../services/admin/service"
import { toast } from "../../../components/toast/toastStore"
import type {
  AcademicSemester,
  AdminLecturer,
  AdminStudent,
  UserRoleTab,
  Department,
} from "../../../services/admin/types"
import {
  getActiveSemester,
  getStudentSemesterOptions,
} from "../academic/semesterOptions"

type ModalMode = "add" | "import" | "menu" | null
type ConfirmAction = "activate" | "deactivate" | "delete"

const currentYear = new Date().getFullYear()
const angkatanOptions = Array.from({ length: 8 }, (_, index) => currentYear - index)

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
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [keyword, semester, role])

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
  const isStudent = role === "students"

  function renderPagination(currentPage: number, totalPages: number, onPageChange: (p: number) => void, totalItems: number) {
    if (totalItems === 0) return null

    return (
      <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-gray-100 pt-6">
        {/* Page Number Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
            >
              &lt;
            </button>
            {(() => {
              const maxPagesToShow = 10
              let startPage = Math.max(1, currentPage - 5)
              let endPage = startPage + maxPagesToShow - 1
              if (endPage > totalPages) {
                endPage = totalPages
                startPage = Math.max(1, endPage - maxPagesToShow + 1)
              }

              const pages = []
              for (let p = startPage; p <= endPage; p++) {
                pages.push(p)
              }

              return pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition cursor-pointer ${currentPage === p
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-100"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {p}
                </button>
              ))
            })()}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
            >
              &gt;
            </button>
          </div>
        )}

        {/* Page Size Dropdown */}
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span>Tampilkan</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              onPageChange(1) // Reset to first page
            }}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-gray-700 font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>data per halaman</span>
        </div>
      </div>
    )
  }

  // Department & Study Program states
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState("dept-3")
  const [selectedProdiId, setSelectedProdiId] = useState("prodi-8")

  // Drag & Drop Import File states & ref
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [importFileError, setImportFileError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleConfirmAction = async () => {
    if (!confirm) return
    const key = `${confirm.action}-${confirm.user.id}`
    setActionLoading(key)
    try {
      if (confirm.action === "activate") {
        await activateAdminUser(confirm.user.id)
        toast.success("Pengguna berhasil diaktifkan.")
      } else if (confirm.action === "deactivate") {
        await deactivateAdminUser(confirm.user.id)
        toast.success("Pengguna berhasil dinonaktifkan.")
      } else {
        await deleteAdminUser(confirm.user.id)
        toast.success("Pengguna berhasil dihapus.")
      }
      setConfirm(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses aksi")
    } finally {
      setActionLoading("")
    }
  }

  const handleBulkActionSubmit = async () => {
    if (!bulkConfirm) return
    try {
      setSubmitting(true)
      setError("")
      const { action, ids } = bulkConfirm
      if (action === "activate") {
        await Promise.all(ids.map((id) => activateAdminUser(id)))
        toast.success(`${ids.length} pengguna berhasil diaktifkan.`)
      } else if (action === "deactivate") {
        await Promise.all(ids.map((id) => deactivateAdminUser(id)))
        toast.success(`${ids.length} pengguna berhasil dinonaktifkan.`)
      } else {
        await Promise.all(ids.map((id) => deleteAdminUser(id)))
        toast.success(`${ids.length} pengguna berhasil dihapus.`)
      }
      setSelectedIds([])
      setBulkConfirm(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses aksi massal")
    } finally {
      setSubmitting(false)
    }
  }

  const activeSemester = getActiveSemester(semesters)
  const studentSemesterOptions = getStudentSemesterOptions(activeSemester?.term)

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
    async function fetchDepartments() {
      try {
        const data = await getAdminDepartments()
        setDepartments(data)
      } catch {
        toast.error("Gagal memuat data jurusan dan program studi.")
      }
    }
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (!modal) {
      setSelectedDeptId("dept-3")
      setSelectedProdiId("prodi-8")
      setImportFile(null)
      setIsDraggingFile(false)
      setImportFileError("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [modal])

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
      if (isStudent) {
        await createAdminStudent({
          nim: String(form.get("identifier") || ""),
          fullname: String(form.get("fullname") || ""),
          email: String(form.get("email") || ""),
          angkatan: Number(form.get("angkatan") || 0),
          semester: Number(form.get("semester") || 0),
          status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
          studyProgramId: selectedProdiId,
        })
        toast.success("Mahasiswa dan akun login berhasil ditambahkan.")
      } else {
        const lecturer = await createAdminLecturer({
          nip: String(form.get("identifier") || ""),
          fullname: String(form.get("fullname") || ""),
          email: String(form.get("email") || ""),
          status: String(form.get("status") || "") as "Aktif" | "Nonaktif",
        })
        if (lecturer.initialPassword) {
          toast.success(`Dosen berhasil ditambahkan. Password awal: ${lecturer.initialPassword}`, 15000)
        } else {
          toast.success("Dosen berhasil ditambahkan.")
        }
      }

      setModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengguna")
    } finally {
      setSubmitting(false)
    }
  }

  const allowedExtensions = ["xlsx", "xls", "csv"]

  const validateImportFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      return "Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv."
    }
    return ""
  }

  const handleImportFileSelect = (file: File) => {
    const errorMessage = validateImportFile(file)
    if (errorMessage) {
      setImportFile(null)
      setImportFileError(errorMessage)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }
    setImportFile(file)
    setImportFileError("")
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }

  const handleDropImportFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleImportFileSelect(file)
    }
  }

  const handleRemoveImportFile = () => {
    setImportFile(null)
    setImportFileError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!importFile) return

    try {
      setSubmitting(true)
      setError("")
      let rows: string[][] = []
      const extension = importFile.name.split(".").pop()?.toLowerCase()
      if (extension === "xlsx" || extension === "xls") {
        const data = await importFile.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(data), { type: "array" })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error("File Excel tidak memiliki sheet data")
        const worksheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        rows = rawRows.map(row => row.map(cell => String(cell === null || cell === undefined ? "" : cell).trim()))
      } else {
        rows = parseCsv(await importFile.text())
      }
      const normalizedRows = rows[0]?.[0]?.toLowerCase().includes(isStudent ? "nim" : "nip")
        ? rows.slice(1)
        : rows

      for (const row of normalizedRows) {
        if (isStudent) {
          const [nim, fullname, angkatan, semesterValue, email, programStudi, jurusan] = row
          await createAdminStudent({
            nim,
            fullname,
            angkatan: Number(angkatan || 0),
            semester: Number(semesterValue || 0),
            email,
            status: "Aktif",
            programStudi: programStudi || undefined,
            jurusan: jurusan || undefined,
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
      toast.success(`Berhasil mengimport data ${isStudent ? "mahasiswa" : "dosen"}.`)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengimport pengguna")
    } finally {
      setSubmitting(false)
    }
  }

  const closeUserModal = () => {
    setModal(null)
  }

  const renderAddModal = () => {
    if (!modal || modal === "menu") return null

    const title = modal === "import"
      ? `Import ${isStudent ? "Mahasiswa" : "Dosen"}`
      : isStudent
        ? "Tambah Mahasiswa dan Buat Akun Login"
        : "Tambah Dosen"

    if (modal === "import") {
      return (
        <AdminModal
          title={title}
          onClose={() => setModal(null)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModal(null)} disabled={submitting}>Batal</AdminButton>
              <AdminButton type="submit" form="admin-import-form" disabled={submitting || !importFile || !!importFileError}>
                {submitting ? "Mengimport..." : "Import"}
              </AdminButton>
            </>
          }
        >
          <form id="admin-import-form" className="space-y-5" onSubmit={handleImportSubmit}>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Upload File Import</p>

              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropImportFile}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${isDraggingFile
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      handleImportFileSelect(file)
                    }
                  }}
                />

                <FileUp className={`h-10 w-10 mb-3 ${isDraggingFile ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop file di sini atau klik untuk memilih file
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format yang didukung: .xlsx, .xls, atau .csv
                </p>
              </div>

              {importFileError && (
                <p className="mt-2 text-sm text-red-600 font-medium">{importFileError}</p>
              )}

              {importFile && !importFileError && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="rounded bg-blue-100 p-1.5 text-blue-700">
                      <FileUp size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase">File terpilih</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{importFile.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveImportFile()
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                  >
                    Hapus file
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Catatan:</p>
              <p>
                Format: {isStudent ? "NIM, Nama, Angkatan, Semester, Email, Program Studi (Opsional), Jurusan (Opsional)" : "NIP, Nama, Email"}
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
              {submitting ? "Menyimpan..." : isStudent ? "Tambah Mahasiswa dan Akun" : "Tambah Dosen"}
            </AdminButton>
          </>
        }
      >
        <form id="admin-user-form" className="space-y-4" onSubmit={handleAddSubmit}>
          {isStudent && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Data ini membuat profil mahasiswa sekaligus akun login mahasiswa. Posisi semester dan rombel berjalan tetap diatur melalui menu Kelas Mahasiswa.
            </div>
          )}
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
                <select name="angkatan" className={inputClass} defaultValue="" required>
                  <option value="" disabled>Pilih angkatan</option>
                  {angkatanOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
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
              <FieldRow label="Jurusan">
                <select
                  className={inputClass}
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value)
                    setSelectedProdiId("")
                  }}
                  required
                >
                  <option value="" disabled>Pilih Jurusan</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Program Studi">
                <select
                  className={inputClass}
                  value={selectedProdiId}
                  onChange={(e) => setSelectedProdiId(e.target.value)}
                  disabled={!selectedDeptId}
                  required
                >
                  <option value="" disabled>
                    Pilih Program Studi
                  </option>
                  {(
                    departments.find((d) => d.id === selectedDeptId)
                      ?.studyPrograms || []
                  ).map((prodi) => (
                    <option key={prodi.id} value={prodi.id}>
                      {prodi.name}
                    </option>
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
              <option>Cuti</option>
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
                {isStudent ? "Tambah Mahasiswa dan Akun" : "Tambah Dosen"}
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
          <>
            <AdminTable headers={selectedIds.length > 0 ? ["", "NIM", "Nama", "Semester", "Status", "Aksi"] : ["NIM", "Nama", "Semester", "Status", "Aksi"]}>
              {students.slice((page - 1) * limit, page * limit).map((student) => (
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
            {renderPagination(page, Math.ceil(students.length / limit), setPage, students.length)}
          </>
        ) : (
          <EmptyState
            title="Belum ada data mahasiswa"
            action={<AdminButton onClick={() => setModal("add")}><Plus size={16} />Tambah Mahasiswa dan Akun</AdminButton>}
          />
        )
      ) : lecturers.length ? (
        <>
          <AdminTable headers={selectedIds.length > 0 ? ["", "NIP", "Nama", "Email", "Status", "Aksi"] : ["NIP", "Nama", "Email", "Status", "Aksi"]}>
            {lecturers.slice((page - 1) * limit, page * limit).map((lecturer) => (
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
          {renderPagination(page, Math.ceil(lecturers.length / limit), setPage, lecturers.length)}
        </>
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
