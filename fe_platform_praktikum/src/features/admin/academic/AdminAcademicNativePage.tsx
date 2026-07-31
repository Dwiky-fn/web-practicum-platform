import { AlertTriangle, ArrowLeft, Eye, Loader2, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom"
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
import { getAdminUsers } from "../../../services/admin/service"
import type { AdminLecturer, AdminStudent } from "../../../services/admin/types"
import { toast } from "../../../components/toast/toastStore"
import {
  academicDataApi,
  type KelasMahasiswa,
  type KelasMaster,
  type KelasPraktikum,
  type KelasPraktikumMahasiswa,
  type AcademicStatus,
  type KelasPraktikumStatus,
  type Kurikulum,
  type MataKuliah,
  type Pengampu,
  type PengampuPeran,
  type SemesterMaster,
  type TahunSemester,
  type KelasSemester,
} from "../../../services/admin/academicData/service"

type NativeTab =
  | "tahun"
  | "kurikulum"
  | "semester"
  | "kelas"
  | "mata-kuliah"
  | "kelas-mahasiswa"
  | "kelas-praktikum"

type FormState = Record<string, string>
type AcademicItem =
  | TahunSemester
  | Kurikulum
  | SemesterMaster
  | KelasMaster
  | MataKuliah
  | KelasMahasiswa
  | KelasSemester
  | KelasPraktikum
type EditingState = { tab: NativeTab; item?: AcademicItem } | null
type DeleteTarget = { tab: NativeTab; id: string; label: string } | null
type PromotionTarget = {
  targetKelasSemesterId: string
}

const masterTabs: Array<{ id: NativeTab; label: string }> = [
  { id: "tahun", label: "Tahun Semester" },
  { id: "kurikulum", label: "Kurikulum" },
  { id: "semester", label: "Semester" },
  { id: "kelas", label: "Kelas" },
  { id: "mata-kuliah", label: "Mata Kuliah" },
]

const operationalTabs: Array<{ id: NativeTab; label: string }> = [
  { id: "kelas-mahasiswa", label: "Kelas Mahasiswa" },
  { id: "kelas-praktikum", label: "Kelas Praktikum" },
]

const allTabs = [...masterTabs, ...operationalTabs]
const statusOptions: Array<{ label: string; value: AcademicStatus }> = [
  { label: "Aktif", value: "active" },
  { label: "Tidak Aktif", value: "inactive" },
]
const tipeOptions: Array<{ label: string; value: string }> = [
  { label: "Praktikum", value: "praktikum" },
  { label: "Teori", value: "teori" },
  { label: "Teori & Praktikum", value: "teori_praktikum" },
]

const formatTipeLabel = (tipe: string) => {
  const t = String(tipe || "").toLowerCase().trim()
  if (t === "teori") return "Teori"
  if (t === "teori_praktikum" || (t.includes("teori") && t.includes("praktik"))) return "Teori & Praktikum"
  return "Praktikum"
}
const routeToTab: Record<string, NativeTab> = {
  "tahun-semester": "tahun",
  kurikulum: "kurikulum",
  semester: "semester",
  kelas: "kelas",
  "mata-kuliah": "mata-kuliah",
  "kelas-mahasiswa": "kelas-mahasiswa",
  "kelas-praktikum": "kelas-praktikum",
}
const pageCopy: Record<NativeTab, { title: string; description: string; addLabel: string }> = {
  tahun: {
    title: "Tahun Semester",
    description: "Kelola periode akademik seperti 2025/2026 Ganjil atau 2025/2026 Genap.",
    addLabel: "Tambah Tahun Semester",
  },
  kurikulum: {
    title: "Kurikulum",
    description: "Kelola kurikulum yang digunakan sebagai dasar mata kuliah.",
    addLabel: "Tambah Kurikulum",
  },
  semester: {
    title: "Semester",
    description: "Kelola master semester seperti semester 1, 2, 3, dan seterusnya.",
    addLabel: "Tambah Semester",
  },
  kelas: {
    title: "Kelas",
    description: "Kelola master kelas atau rombel seperti A, B, C, dan D.",
    addLabel: "Tambah Kelas",
  },
  "mata-kuliah": {
    title: "Mata Kuliah",
    description: "Kelola mata kuliah berdasarkan kurikulum dan semester.",
    addLabel: "Tambah Mata Kuliah",
  },
  "kelas-mahasiswa": {
    title: "Kelas Mahasiswa",
    description: "Atur posisi mahasiswa pada tahun semester, semester, dan kelas tertentu.",
    addLabel: "Tambah Kelas Mahasiswa",
  },
  "kelas-praktikum": {
    title: "Kelas Praktikum",
    description: "Buka kelas praktikum berdasarkan mata kuliah, kelas/rombel, tahun semester, dan dosen pengampu.",
    addLabel: "Tambah Kelas Praktikum",
  },
}

const searchPlaceholder: Record<NativeTab, string> = {
  tahun: "Cari tahun semester",
  kurikulum: "Cari kurikulum",
  semester: "Cari semester",
  kelas: "Cari kelas",
  "mata-kuliah": "Cari mata kuliah",
  "kelas-mahasiswa": "Cari kelas mahasiswa",
  "kelas-praktikum": "Cari kelas praktikum",
}

// Upfront warning messages shown in the single delete modal per tab
const tabDeleteWarning: Partial<Record<NativeTab | "kelas-semester" | "kelas-mahasiswa-detail", string>> = {
  tahun: "Menghapus tahun semester akan menghapus seluruh kelas semester, kelas praktikum, data mahasiswa terdaftar, serta progress dan nilai tugas pada periode akademik ini secara permanen.",
  kurikulum: "Menghapus kurikulum akan menghapus seluruh mata kuliah, kelas praktikum, jobsheet, serta progress dan nilai tugas mahasiswa terkait kurikulum ini secara permanen.",
  semester: "Menghapus master semester akan menghapus seluruh data akademik terkait (mata kuliah, kelas semester, kelas praktikum) beserta data progress dan submission mahasiswa secara permanen.",
  kelas: "Menghapus master kelas akan menghapus seluruh kelas semester, kelas praktikum, data mahasiswa terdaftar, serta progress dan nilai tugas yang terkait kelas ini secara permanen.",
  "mata-kuliah": "Menghapus mata kuliah akan menghapus seluruh jobsheet, kelas praktikum, serta data progress dan nilai tugas mahasiswa terkait secara permanen.",
  "kelas-semester": "Menghapus kelas ini akan menghapus pendaftaran seluruh mahasiswa di dalamnya beserta data progress, nilai tugas, dan kelas praktikum terkait secara permanen.",
  "kelas-mahasiswa-detail": "Menghapus mahasiswa dari kelas ini akan menghapus seluruh data progress, nilai, dan submission mahasiswa tersebut pada kelas ini secara permanen.",
  "kelas-praktikum": "Menghapus kelas praktikum ini akan menghapus seluruh data progress, nilai tugas, pengampu, serta jobsheet terkait kelas praktikum ini secara permanen.",
}

function includesKeyword(values: Array<string | number | undefined>, keyword: string) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized))
}

function getStatusLabel(status?: string) {
  const map: Record<string, string> = {
    active: "Aktif",
    inactive: "Tidak Aktif",
  }

  return map[status ?? ""] ?? "Tidak Aktif"
}

function normalizeAcademicStatus(status?: string): AcademicStatus {
  return status === "active" || status === "open" ? "active" : "inactive"
}

function statusBadge(value?: string) {
  const normalized = normalizeAcademicStatus(value)
  const style = normalized === "active"
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600"

  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${style}`}>{getStatusLabel(normalized)}</span>
}

function statusBadgeIndo(value?: string) {
  return statusBadge(value)
}

function formatActiveSuffix(status?: string) {
  return normalizeAcademicStatus(status) === "active" ? " - Aktif" : ""
}

function warningBox(message: string) {
  return <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>
}

function emptyLabel(tab: NativeTab) {
  if (tab === "tahun") return "Belum ada tahun semester."
  if (tab === "kurikulum") return "Belum ada kurikulum."
  if (tab === "semester") return "Belum ada master semester."
  if (tab === "kelas") return "Belum ada master kelas/rombel."
  if (tab === "mata-kuliah") return "Belum ada mata kuliah."
  if (tab === "kelas-mahasiswa") return "Belum ada kelas mahasiswa."
  return "Belum ada kelas praktikum."
}

function parseTahunSemester(value?: string) {
  const match = String(value ?? "").trim().match(/^(\d{4})\/(\d{4})\s+(Ganjil|Genap)$/i)
  if (!match) {
    return { tahun_awal: "", tahun_akhir: "", semester_type: "Ganjil" }
  }
  return {
    tahun_awal: match[1],
    tahun_akhir: match[2],
    semester_type: match[3][0].toUpperCase() + match[3].slice(1).toLowerCase(),
  }
}

function buildTahunSemester(form: FormState) {
  return `${form.tahun_awal}/${form.tahun_akhir} ${form.semester_type}`
}

function validateTahunSemesterForm(form: FormState, existing: TahunSemester[], currentId?: string) {
  if (!/^\d{4}$/.test(form.tahun_awal ?? "")) throw new Error("Tahun awal harus 4 digit.")
  if (!/^\d{4}$/.test(form.tahun_akhir ?? "")) throw new Error("Tahun akhir harus 4 digit.")
  const tahunAwal = Number(form.tahun_awal)
  const tahunAkhir = Number(form.tahun_akhir)
  if (tahunAkhir <= tahunAwal) throw new Error("Tahun akhir harus lebih besar dari tahun awal.")
  if (tahunAkhir !== tahunAwal + 1) throw new Error("Tahun akhir harus satu tahun setelah tahun awal.")
  if (!["Ganjil", "Genap"].includes(form.semester_type ?? "")) throw new Error("Jenis semester wajib Ganjil atau Genap.")
  const tahunSemester = buildTahunSemester(form)
  const duplicate = existing.some((item) => item.id !== currentId && item.tahun_semester.toLowerCase() === tahunSemester.toLowerCase())
  if (duplicate) throw new Error("Tahun semester tersebut sudah terdaftar.")
  return tahunSemester
}

function formatKelasMahasiswaName(item: { semester_num?: number | string; kelas_name?: string; semester?: number | string; kelas?: string }) {
  const sem = item.semester_num ?? item.semester ?? ""
  const kls = item.kelas_name ?? item.kelas ?? ""
  return `${sem}${kls}`
}

function formatKelasPraktikumName(item: { nama_mk?: string; semester?: number; kelas?: string }) {
  const mk = item.nama_mk ?? ""
  const sem = item.semester ?? ""
  const kls = item.kelas ?? ""
  return `${mk} - ${sem}${kls}`
}

export default function AdminAcademicNativePage() {
  const { section, id: detailId, tahunSemesterId, semId, kelasId } = useParams<{ section?: string; id?: string; tahunSemesterId?: string; semId?: string; kelasId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const paramSemesterId = searchParams.get("semesterId") || semId || ""
  const paramKelasId = searchParams.get("kelasId") || kelasId || ""
  const isTahunSemesterDetail = Boolean(tahunSemesterId)
  const isKelasMahasiswaDetail = isTahunSemesterDetail && location.pathname.includes("/kelas-mahasiswa")
  const kelasPraktikumDetailId = isTahunSemesterDetail ? undefined : detailId
  const activeTab = kelasPraktikumDetailId ? "kelas-praktikum" : section ? routeToTab[section] ?? "tahun" : "tahun"
  const isDashboard = !section && !detailId && !tahunSemesterId

  const [keyword, setKeyword] = useState("")
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [keyword, activeTab])

  const [kelasMahasiswaSearch, setKelasMahasiswaSearch] = useState("")
  const [detailKelasMahasiswaSearch, setDetailKelasMahasiswaSearch] = useState("")
  const [kelasPraktikumSearch, setKelasPraktikumSearch] = useState("")
  const [localTab, setLocalTab] = useState<"mahasiswa" | "praktikum">("mahasiswa")
  const [searchMahasiswa, setSearchMahasiswa] = useState("")
  const [isPindahan, setIsPindahan] = useState(false)
  const [selectedMahasiswaIds, setSelectedMahasiswaIds] = useState<string[]>([])
  const [operationalTahunSemesterId, setOperationalTahunSemesterId] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const setError = useCallback((message: string) => {
    if (message) toast.error(message)
  }, [])
  const setSuccess = useCallback((message: string) => {
    if (message) toast.success(message)
  }, [])
  const [modal, setModal] = useState<EditingState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [form, setForm] = useState<FormState>({})
  const [detail, setDetail] = useState<KelasPraktikum | null>(null)
  const [detailStudents, setDetailStudents] = useState<KelasPraktikumMahasiswa[]>([])
  const [detailPengampu, setDetailPengampu] = useState<Pengampu[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [tahunSemester, setTahunSemester] = useState<TahunSemester[]>([])
  const [kurikulum, setKurikulum] = useState<Kurikulum[]>([])
  const [semester, setSemester] = useState<SemesterMaster[]>([])
  const [kelas, setKelas] = useState<KelasMaster[]>([])
  const [mataKuliah, setMataKuliah] = useState<MataKuliah[]>([])
  const [kelasMahasiswa, setKelasMahasiswa] = useState<KelasMahasiswa[]>([])
  const [kelasSemester, setKelasSemester] = useState<KelasSemester[]>([])
  const [kelasPraktikum, setKelasPraktikum] = useState<KelasPraktikum[]>([])
  const [pengampu, setPengampu] = useState<Pengampu[]>([])
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])

  // Promotion/Transition Wizard states
  const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false)
  const [isPromotionConfirmOpen, setIsPromotionConfirmOpen] = useState(false)
  const [promotionSubmitError, setPromotionSubmitError] = useState("")
  const [promotionTargets, setPromotionTargets] = useState<Record<string, PromotionTarget>>({})
  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([])
  const [submittingPromotion, setSubmittingPromotion] = useState(false)

  useEffect(() => {
    if (!isPromotionConfirmOpen && !submittingPromotion) {
      document.getElementById("promotion-process-button")?.focus()
    }
  }, [isPromotionConfirmOpen, submittingPromotion])

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

  const activeTahunSemester = tahunSemester.find((item) => item.status === "active") ?? null
  const activeKurikulum = kurikulum.find((item) => item.status === "active") ?? null
  const activeKurikulumList = kurikulum.filter((item) => item.status === "active")
  const activeTabMeta = pageCopy[activeTab]
  const detailTahunSemester = tahunSemester.find((item) => item.id === tahunSemesterId) ?? null
  const selectedOperationalTahunSemester =
    detailTahunSemester
    ?? tahunSemester.find((item) => item.id === operationalTahunSemesterId)
    ?? activeTahunSemester
    ?? tahunSemester[0]
    ?? null

  const currentSemesterType = useMemo(() => {
    if (!detailTahunSemester) return null
    const name = detailTahunSemester.tahun_semester || ""
    if (/genap/i.test(name)) return "Genap"
    if (/ganjil/i.test(name)) return "Ganjil"
    console.warn("Format tahun semester tidak dikenali:", name)
    return null
  }, [detailTahunSemester])

  const filteredSemestersForModal = useMemo(() => {
    if (!currentSemesterType) return semester
    return semester.filter((item) => {
      const semNum = Number(item.semester)
      if (currentSemesterType === "Ganjil") {
        return semNum % 2 !== 0
      } else if (currentSemesterType === "Genap") {
        return semNum % 2 === 0
      }
      return true
    })
  }, [semester, currentSemesterType])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [
        tahunData,
        kurikulumData,
        semesterData,
        kelasData,
        mataKuliahData,
        kelasMahasiswaData,
        kelasSemesterData,
        kelasPraktikumData,
        pengampuData,
        studentData,
        lecturerData,
      ] = await Promise.all([
        academicDataApi.getTahunSemester(),
        academicDataApi.getKurikulum(),
        academicDataApi.getSemester(),
        academicDataApi.getKelas(),
        academicDataApi.getMataKuliah(),
        academicDataApi.getKelasMahasiswa(),
        academicDataApi.getKelasSemester(),
        academicDataApi.getKelasPraktikum(),
        academicDataApi.getPengampu(),
        getAdminUsers("students"),
        getAdminUsers("lecturers"),
      ])

      setTahunSemester(tahunData)
      setKurikulum(kurikulumData)
      setSemester(semesterData)
      setKelas(kelasData)
      setMataKuliah(mataKuliahData)
      setKelasMahasiswa(kelasMahasiswaData)
      setKelasSemester(kelasSemesterData)
      setKelasPraktikum(kelasPraktikumData)
      setPengampu(pengampuData)
      setStudents(studentData as AdminStudent[])
      setLecturers(lecturerData as AdminLecturer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data akademik.")
    } finally {
      setLoading(false)
    }
  }, [setError])

  const openDetail = useCallback(async (item: KelasPraktikum) => {
    setDetail(item)
    setDetailStudents([])
    setDetailPengampu([])
    setDetailLoading(true)
    setError("")
    try {
      const [studentsData, pengampuData] = await Promise.all([
        academicDataApi.getKelasPraktikumMahasiswa(item.id),
        academicDataApi.getKelasPraktikumPengampu(item.id),
      ])
      setDetailStudents(studentsData)
      setDetailPengampu(pengampuData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail kelas praktikum.")
    } finally {
      setDetailLoading(false)
    }
  }, [setError])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!tahunSemester.length) {
      if (operationalTahunSemesterId) setOperationalTahunSemesterId("")
      return
    }
    if (operationalTahunSemesterId && tahunSemester.some((item) => item.id === operationalTahunSemesterId)) return
    setOperationalTahunSemesterId((activeTahunSemester ?? tahunSemester[0]).id)
  }, [activeTahunSemester, operationalTahunSemesterId, tahunSemester])

  useEffect(() => {
    if ((section === "kelas-mahasiswa" || section === "kelas-praktikum") && selectedOperationalTahunSemester) {
      navigate(`/admin/academic/tahun-semester/${selectedOperationalTahunSemester.id}`, { replace: true })
    }
  }, [navigate, section, selectedOperationalTahunSemester])

  useEffect(() => {
    if (!kelasPraktikumDetailId || !kelasPraktikum.length || detail?.id === kelasPraktikumDetailId) return
    const item = kelasPraktikum.find((entry) => entry.id === kelasPraktikumDetailId)
    if (item) {
      openDetail(item)
    }
  }, [kelasPraktikumDetailId, kelasPraktikum, detail?.id, openDetail])

  const openPromotionWizard = async () => {
    if (!currentKelasSemester) return
    setPromotionSubmitError("")
    setIsPromotionConfirmOpen(false)
    const targets: Record<string, PromotionTarget> = {}
    activePromotionStudents.forEach((student) => {
      const options = getPromotionTargetOptions(student)
      const defaultTarget = options.find((item) => item.id_kelas === student.id_kelas) ?? options[0]
      targets[student.id_mahasiswa] = { targetKelasSemesterId: defaultTarget?.id ?? "" }
    })
    setSelectedPromotionIds(activePromotionStudents.map((student) => student.id_mahasiswa))
    setPromotionTargets(targets)
    setIsPromotionWizardOpen(true)
  }

  const updatePromotionTarget = (studentId: string, target: Partial<PromotionTarget>) => {
    setPromotionTargets((current) => {
      const previous = current[studentId] ?? { targetKelasSemesterId: "" }
      return { ...current, [studentId]: { ...previous, ...target } }
    })
  }

  const togglePromotionStudent = (studentId: string, checked: boolean) => {
    setSelectedPromotionIds((current) => {
      if (checked) return current.includes(studentId) ? current : [...current, studentId]
      return current.filter((id) => id !== studentId)
    })
  }

  const handlePromotionSubmit = async () => {
    setPromotionSubmitError("")
    if (!currentKelasSemester) {
      toast.error("Kelas asal tidak valid.")
      return
    }
    if (!selectedPromotionIds.length) {
      toast.error("Pilih minimal satu mahasiswa aktif untuk dinaikkan.")
      return
    }
    const invalid = selectedPromotionIds.find((studentId) => {
      const target = promotionTargets[studentId]
      return !target?.targetKelasSemesterId
    })
    if (invalid) {
      toast.error("Kelas tujuan pada semester berikutnya belum tersedia. Silakan buat kelas tujuan terlebih dahulu.")
      return
    }
    setIsPromotionConfirmOpen(true)
  }

  const processPromotion = async () => {
    if (submittingPromotion) return
    setPromotionSubmitError("")
    setSubmittingPromotion(true)
    try {
      const payload = {
        sourceKelasSemesterId: currentKelasSemester?.id ?? "",
        transitions: selectedPromotionIds.map((studentId) => ({
          studentId,
          targetKelasSemesterId: promotionTargets[studentId]?.targetKelasSemesterId ?? "",
        })),
      }

      const result = await academicDataApi.transitionStudents(payload)
      toast.success(`Kenaikan semester berhasil diproses untuk ${result.processed_students} mahasiswa.`)
      setIsPromotionConfirmOpen(false)
      setIsPromotionWizardOpen(false)
      loadData()
    } catch (err) {
      setPromotionSubmitError(err instanceof Error ? err.message : "Gagal memproses kenaikan semester.")
    } finally {
      setSubmittingPromotion(false)
    }
  }

  const mataKuliahPrioritized = useMemo(() => {
    const selectedKurikulumId = form.id_kurikulum || activeKurikulum?.id || ""
    const pool = selectedKurikulumId
      ? mataKuliah.filter((item) => item.id_kurikulum === selectedKurikulumId)
      : []
    const parityFiltered = currentSemesterType
      ? pool.filter((item) => currentSemesterType === "Ganjil" ? Number(item.semester) % 2 !== 0 : Number(item.semester) % 2 === 0)
      : pool
    return [...parityFiltered].sort((left, right) => {
      const leftActive = activeKurikulum && left.id_kurikulum === activeKurikulum.id ? 0 : 1
      const rightActive = activeKurikulum && right.id_kurikulum === activeKurikulum.id ? 0 : 1
      if (leftActive !== rightActive) return leftActive - rightActive
      return left.nama_mk.localeCompare(right.nama_mk, "id-ID")
    })
  }, [activeKurikulum, currentSemesterType, form.id_kurikulum, mataKuliah])

  const selectedMataKuliah = mataKuliah.find((item) => item.id === form.id_mata_kuliah) ?? null
  const selectedSemester = semester.find((item) => item.id === (selectedMataKuliah?.id_semester || form.id_semester)) ?? null
  const selectedKelas = kelas.find((item) => item.id === form.id_kelas) ?? null

  const generatedKelasPraktikumName = selectedMataKuliah && selectedSemester && selectedKelas
    ? `${selectedMataKuliah.nama_mk} - ${selectedSemester.semester}${selectedKelas.kelas}`
    : "Lengkapi data kelas praktikum"
  const scopedKelasMahasiswa = useMemo(() => {
    if (!selectedOperationalTahunSemester) return []
    return kelasMahasiswa.filter((item) => item.id_tahun_semester === selectedOperationalTahunSemester.id)
  }, [kelasMahasiswa, selectedOperationalTahunSemester])
  const scopedKelasPraktikum = useMemo(() => {
    if (!selectedOperationalTahunSemester) return []
    return kelasPraktikum.filter((item) => item.id_tahun_semester === selectedOperationalTahunSemester.id)
  }, [kelasPraktikum, selectedOperationalTahunSemester])

  const scopedKelasSemester = useMemo(() => {
    if (!selectedOperationalTahunSemester) return []
    return kelasSemester.filter((item) => item.id_tahun_semester === selectedOperationalTahunSemester.id)
  }, [kelasSemester, selectedOperationalTahunSemester])

  const groupedKelasMahasiswa = useMemo(() => {
    return scopedKelasSemester
      .filter((item) => {
        const displayClassName = formatKelasMahasiswaName({ semester_num: item.semester, kelas_name: item.kelas })
        return includesKeyword([displayClassName, getStatusLabel(item.status)], kelasMahasiswaSearch)
      })
      .map((item) => ({
        id: item.id,
        id_tahun_semester: item.id_tahun_semester,
        id_semester: item.id_semester,
        id_kelas: item.id_kelas,
        jumlah_mahasiswa: item.jumlah_mahasiswa,
        status: item.status,
        tahun_semester: item.tahun_semester,
        semester_num: item.semester,
        kelas_name: item.kelas,
        students: Array.from({ length: item.jumlah_mahasiswa }, () => null as KelasMahasiswa | null),
      }))
      .sort((left, right) => {
        const leftSem = left.semester_num ?? 0
        const rightSem = right.semester_num ?? 0
        if (leftSem !== rightSem) return leftSem - rightSem
        const leftKls = left.kelas_name ?? ""
        const rightKls = right.kelas_name ?? ""
        return leftKls.localeCompare(rightKls)
      })
  }, [scopedKelasSemester, kelasMahasiswaSearch])

  const classStudents = useMemo(() => {
    return scopedKelasMahasiswa.filter(
      (item) => item.id_semester === paramSemesterId && item.id_kelas === paramKelasId
    )
  }, [scopedKelasMahasiswa, paramSemesterId, paramKelasId])

  const currentKelasSemester = useMemo(() => {
    if (!isKelasMahasiswaDetail) return null
    return kelasSemester.find((item) =>
      item.id_tahun_semester === tahunSemesterId
      && item.id_semester === paramSemesterId
      && item.id_kelas === paramKelasId
    ) ?? null
  }, [isKelasMahasiswaDetail, kelasSemester, tahunSemesterId, paramSemesterId, paramKelasId])

  const activePromotionStudents = useMemo(() => {
    return classStudents.filter((item) => String(item.student_status || "").toLowerCase() === "aktif")
  }, [classStudents])

  const getPromotionTargetOptions = useCallback((student: KelasMahasiswa) => {
    const targetSemester = Number(student.student_semester ?? student.semester) + 1
    return kelasSemester
      .filter((item) => Number(item.semester) === targetSemester)
      .sort((left, right) => {
        const sameAsSourceLeft = left.id_kelas === student.id_kelas ? 0 : 1
        const sameAsSourceRight = right.id_kelas === student.id_kelas ? 0 : 1
        if (sameAsSourceLeft !== sameAsSourceRight) return sameAsSourceLeft - sameAsSourceRight
        return String(left.kelas ?? "").localeCompare(String(right.kelas ?? ""))
      })
  }, [kelasSemester])

  const filteredClassStudents = useMemo(() => {
    return classStudents.filter((item) =>
      includesKeyword([item.nim, item.fullname, getStatusLabel(item.status)], detailKelasMahasiswaSearch)
    )
  }, [classStudents, detailKelasMahasiswaSearch])

  const existingStudentIds = useMemo(() => {
    return new Set(classStudents.map((item) => item.id_mahasiswa))
  }, [classStudents])

  const filteredMahasiswa = useMemo(() => {
    const normalized = searchMahasiswa.trim().toLowerCase()
    let pool = students
    if (isKelasMahasiswaDetail) {
      const targetSemester = semester.find((item) => item.id === paramSemesterId)?.semester
      const registeredInSamePeriod = new Set(
        scopedKelasMahasiswa
          .filter((item) => item.id_tahun_semester === tahunSemesterId)
          .map((item) => item.id_mahasiswa),
      )
      pool = students.filter((s) =>
        !existingStudentIds.has(s.id)
        && !registeredInSamePeriod.has(s.id)
        && s.status === "Aktif"
        && (isPindahan || Number(s.semester) === Number(targetSemester))
      )
    }
    if (!normalized) return pool
    return pool.filter((student) =>
      [student.nim, student.fullname, student.email].some((value) =>
        value?.toLowerCase().includes(normalized),
      )
    )
  }, [searchMahasiswa, isPindahan, students, isKelasMahasiswaDetail, paramSemesterId, semester, scopedKelasMahasiswa, tahunSemesterId, existingStudentIds])


  const filtered = useMemo(() => {
    if (activeTab === "tahun") return tahunSemester.filter((i) => includesKeyword([i.tahun_semester, getStatusLabel(i.status)], keyword))
    if (activeTab === "kurikulum") return kurikulum.filter((i) => includesKeyword([i.tahun_kurikulum, i.nama_kurikulum, getStatusLabel(i.status)], keyword))
    if (activeTab === "semester") return semester.filter((i) => includesKeyword([i.semester], keyword))
    if (activeTab === "kelas") return kelas.filter((i) => includesKeyword([i.kelas], keyword))
    if (activeTab === "mata-kuliah") return mataKuliah.filter((i) => includesKeyword([i.kode_mk, i.nama_mk, i.nama_kurikulum, i.semester, i.tipe], keyword))
    return scopedKelasPraktikum.filter((i) => includesKeyword([i.nama_kelas, i.nama_mk, i.tahun_semester, i.kelas, getStatusLabel(i.status)], keyword))
  }, [activeTab, kelas, keyword, kurikulum, mataKuliah, scopedKelasPraktikum, semester, tahunSemester])

  function normalizeForm(tab: NativeTab, item?: AcademicItem): FormState {
    if (tab === "tahun") {
      const tahunItem = item as TahunSemester | undefined
      return parseTahunSemester(tahunItem?.tahun_semester)
    }
    if (tab === "kurikulum") {
      const kurikulumItem = item as Kurikulum | undefined
      return { tahun_kurikulum: kurikulumItem?.tahun_kurikulum ?? "", nama_kurikulum: kurikulumItem?.nama_kurikulum ?? "", status: normalizeAcademicStatus(kurikulumItem?.status) }
    }
    if (tab === "semester") {
      const semesterItem = item as SemesterMaster | undefined
      return { semester: String(semesterItem?.semester ?? "") }
    }
    if (tab === "kelas") {
      const kelasItem = item as KelasMaster | undefined
      return { kelas: kelasItem?.kelas ?? "" }
    }
    if (tab === "mata-kuliah") return {
      kode_mk: (item as MataKuliah | undefined)?.kode_mk ?? "",
      nama_mk: (item as MataKuliah | undefined)?.nama_mk ?? "",
      sks: String((item as MataKuliah | undefined)?.sks ?? ""),
      tipe: (item as MataKuliah | undefined)?.tipe ?? "praktikum",
      id_kurikulum: (item as MataKuliah | undefined)?.id_kurikulum ?? activeKurikulum?.id ?? "",
      id_semester: (item as MataKuliah | undefined)?.id_semester ?? "",
    }
    const kelasMahasiswaItem = item as KelasMahasiswa | undefined
    if (tab === "kelas-mahasiswa") return {
      id_tahun_semester: kelasMahasiswaItem?.id_tahun_semester ?? tahunSemesterId ?? selectedOperationalTahunSemester?.id ?? activeTahunSemester?.id ?? "",
      id_semester: kelasMahasiswaItem?.id_semester ?? paramSemesterId ?? "",
      id_kelas: kelasMahasiswaItem?.id_kelas ?? paramKelasId ?? "",
      id_mahasiswa: kelasMahasiswaItem?.id_mahasiswa ?? "",
      status: kelasMahasiswaItem?.status ?? "active",
    }
    const kelasPraktikumItem = item as KelasPraktikum | undefined
    const existingPengampu = kelasPraktikumItem ? pengampu.find((entry) => entry.id_kelas_praktikum === kelasPraktikumItem.id && entry.peran === "utama") ?? pengampu.find((entry) => entry.id_kelas_praktikum === kelasPraktikumItem.id) : null
    return {
      id_tahun_semester: kelasPraktikumItem?.id_tahun_semester ?? selectedOperationalTahunSemester?.id ?? activeTahunSemester?.id ?? "",
      id_kurikulum: kelasPraktikumItem?.id_kurikulum ?? activeKurikulum?.id ?? "",
      id_mata_kuliah: kelasPraktikumItem?.id_mata_kuliah ?? "",
      id_semester: kelasPraktikumItem?.id_semester ?? "",
      id_kelas: kelasPraktikumItem?.id_kelas ?? "",
      jumlah_jobsheet_rencana: String(kelasPraktikumItem?.jumlah_jobsheet_rencana ?? kelasPraktikumItem?.jumlahJobsheetRencana ?? 1),
      status: kelasPraktikumItem?.status ?? "open",
      id_dosen: existingPengampu?.id_dosen ?? "",
      peran: existingPengampu?.peran ?? "utama",
    }
  }

  const getPrerequisiteWarning = (tab: NativeTab) => {
    if (tab === "mata-kuliah") {
      if (!activeKurikulumList.length) return "Aktifkan minimal satu kurikulum terlebih dahulu sebelum menambahkan mata kuliah."
      if (!semester.length) return "Tambahkan master semester terlebih dahulu sebelum menambahkan mata kuliah."
    }
    if (tab === "kelas-mahasiswa") {
      if (!tahunSemester.length) return "Tambahkan tahun semester terlebih dahulu sebelum mengatur kelas mahasiswa."
      if (!semester.length) return "Tambahkan master semester terlebih dahulu."
      if (!kelas.length) return "Tambahkan master kelas/rombel terlebih dahulu."
      if (!students.length) return "Tambahkan mahasiswa terlebih dahulu."
    }
    if (tab === "kelas-praktikum") {
      if (!tahunSemester.length) return "Tambahkan tahun semester terlebih dahulu sebelum membuat kelas praktikum."
      if (!activeKurikulumList.length) return "Aktifkan minimal satu kurikulum terlebih dahulu sebelum membuat kelas praktikum."
      if (!mataKuliah.length) return "Tambahkan mata kuliah terlebih dahulu sebelum membuat kelas praktikum."
      if (!kelas.length) return "Tambahkan master kelas/rombel terlebih dahulu."
      if (!lecturers.length) return "Tambahkan dosen terlebih dahulu."
    }
    return ""
  }

  const openModal = (tab: NativeTab, item?: AcademicItem) => {
    const warning = !item ? getPrerequisiteWarning(tab) : ""
    if (warning) {
      setError(warning)
      return
    }
    setError("")
    setSuccess("")
    setSearchMahasiswa("")
    setIsPindahan(false)
    setSelectedMahasiswaIds([])
    setModal({ tab, item })
    setForm(normalizeForm(tab, item))
  }

  const closeModal = () => {
    setModal(null)
    setSearchMahasiswa("")
    setIsPindahan(false)
    setSelectedMahasiswaIds([])
    setForm({})
  }

  const setField = (key: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (modal?.tab === "kelas-praktikum" && key === "id_mata_kuliah") {
        const mk = mataKuliah.find((item) => item.id === value)
        next.id_semester = mk?.id_semester ?? ""
      }
      if (modal?.tab === "kelas-praktikum" && key === "id_kurikulum") {
        next.id_mata_kuliah = ""
        next.id_semester = ""
      }
      if (modal?.tab === "kelas" && key === "kelas") {
        next.kelas = value.toUpperCase()
      }
      if (modal?.tab === "tahun" && key === "tahun_awal" && /^\d{4}$/.test(value)) {
        next.tahun_akhir = String(Number(value) + 1)
      }
      return next
    })
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!modal) return
    const id = modal.item?.id as string | undefined
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      if (modal.tab === "tahun") {
        const tahun_semester = validateTahunSemesterForm(form, tahunSemester, id)
        const payload = id ? { tahun_semester } : { tahun_semester, status: "inactive" as const }
        if (id) await academicDataApi.updateTahunSemester(id, payload)
        else await academicDataApi.createTahunSemester(payload)
      } else if (modal.tab === "kurikulum") {
        if (id) await academicDataApi.updateKurikulum(id, form)
        else await academicDataApi.createKurikulum(form)
      } else if (modal.tab === "semester") {
        const duplicate = semester.some((item) => item.id !== id && item.semester === Number(form.semester))
        if (duplicate) throw new Error("Semester tidak boleh duplikat.")
        await academicDataApi.saveSemester({ semester: Number(form.semester) }, id)
      } else if (modal.tab === "kelas") {
        const duplicate = kelas.some((item) => item.id !== id && item.kelas.toUpperCase() === form.kelas.toUpperCase())
        if (duplicate) throw new Error("Kelas tidak boleh duplikat.")
        await academicDataApi.saveKelas({ kelas: form.kelas.toUpperCase() }, id)
      } else if (modal.tab === "mata-kuliah") {
        await academicDataApi.saveMataKuliah({ ...form, sks: Number(form.sks) }, id)
      } else if (modal.tab === "kelas-mahasiswa") {
        if (!isKelasMahasiswaDetail && !id) {
          const isDuplicate = scopedKelasSemester.some(
            (item) => item.id_semester === form.id_semester && item.id_kelas === form.id_kelas
          )
          if (isDuplicate) {
            const sem = semester.find((s) => s.id === form.id_semester)
            const kls = kelas.find((k) => k.id === form.id_kelas)
            const displayClassName = formatKelasMahasiswaName({ semester_num: sem?.semester, kelas_name: kls?.kelas })
            toast.warning(`Kelas ${displayClassName} sudah terdaftar pada tahun semester ini.`)
            setSubmitting(false)
            return
          }

          const sem = semester.find((s) => s.id === form.id_semester)
          const kls = kelas.find((k) => k.id === form.id_kelas)
          const displayClassName = formatKelasMahasiswaName({ semester_num: sem?.semester, kelas_name: kls?.kelas })

          await academicDataApi.saveKelasSemester({
            id_tahun_semester: tahunSemesterId ?? selectedOperationalTahunSemester?.id ?? form.id_tahun_semester,
            id_semester: form.id_semester,
            id_kelas: form.id_kelas,
            status: "active",
          })
          toast.success(`Kelas ${displayClassName} berhasil dibuat.`)
          closeModal()
          await loadData()
          return
        } else {
          if (isKelasMahasiswaDetail) {
            if (selectedMahasiswaIds.length === 0) {
              toast.warning("Pilih minimal satu mahasiswa.")
              setSubmitting(false)
              return
            }
            let successCount = 0
            let failCount = 0
            for (const studentId of selectedMahasiswaIds) {
              try {
                await academicDataApi.saveKelasMahasiswa({
                  id_tahun_semester: tahunSemesterId ?? selectedOperationalTahunSemester?.id ?? form.id_tahun_semester,
                  id_semester: paramSemesterId,
                  id_kelas: paramKelasId,
                  id_mahasiswa: studentId,
                  status: "active",
                })
                successCount++
              } catch (err) {
                toast.error(err instanceof Error ? err.message : `Gagal assign mahasiswa dengan ID ${studentId}`)
                failCount++
              }
            }
            if (failCount === 0) {
              if (successCount === 1) {
                toast.success("Mahasiswa berhasil diassign ke kelas.")
              } else {
                toast.success(`${successCount} mahasiswa berhasil diassign ke kelas.`)
              }
            } else if (successCount > 0) {
              toast.warning(`${successCount} mahasiswa berhasil diassign, ${failCount} gagal.`)
            } else {
              toast.error("Gagal assign mahasiswa.")
            }
            closeModal()
            await loadData()
            return
          } else {
            const isDuplicate = scopedKelasSemester.some(
              (item) => item.id !== id && item.id_semester === form.id_semester && item.id_kelas === form.id_kelas
            )
            if (isDuplicate) {
              const sem = semester.find((s) => s.id === form.id_semester)
              const kls = kelas.find((k) => k.id === form.id_kelas)
              const displayClassName = formatKelasMahasiswaName({ semester_num: sem?.semester, kelas_name: kls?.kelas })
              toast.warning(`Kelas ${displayClassName} sudah terdaftar pada tahun semester ini.`)
              setSubmitting(false)
              return
            }

            await academicDataApi.saveKelasSemester({
              id_tahun_semester: tahunSemesterId ?? selectedOperationalTahunSemester?.id ?? form.id_tahun_semester,
              id_semester: form.id_semester,
              id_kelas: form.id_kelas,
              status: "active",
            }, id)
            toast.success("Kelas berhasil diperbarui.")
            closeModal()
            await loadData()
            return
          }
        }
      } else if (modal.tab === "kelas-praktikum") {
        const mk = mataKuliah.find((item) => item.id === form.id_mata_kuliah)
        const kelasPraktikumPayload = {
          id_tahun_semester: selectedOperationalTahunSemester?.id ?? form.id_tahun_semester,
          id_kurikulum: form.id_kurikulum,
          id_mata_kuliah: form.id_mata_kuliah,
          id_semester: mk?.id_semester ?? form.id_semester,
          id_kelas: form.id_kelas,
          jumlah_jobsheet_rencana: Number(form.jumlah_jobsheet_rencana || 1),
          status: form.status as KelasPraktikumStatus,
        }
        const saved = await academicDataApi.saveKelasPraktikum(kelasPraktikumPayload, id)
        try {
          const existing = pengampu.find((item) => item.id_kelas_praktikum === saved.id && item.peran === "utama") ?? pengampu.find((item) => item.id_kelas_praktikum === saved.id)
          await academicDataApi.savePengampu({
            id_kelas_praktikum: saved.id,
            id_dosen: form.id_dosen,
            peran: (form.peran || "utama") as PengampuPeran,
          }, existing?.id)
        } catch {
          setError("Kelas praktikum berhasil disimpan, tetapi pengampu belum tersimpan. Silakan edit kelas praktikum untuk menyimpan pengampu.")
          closeModal()
          await loadData()
          return
        }
      }
      setSuccess("Data berhasil disimpan.")
      closeModal()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data.")
    } finally {
      setSubmitting(false)
    }
  }

  async function activate(tab: NativeTab, id: string) {
    setSubmitting(true)
    setError("")
    try {
      if (tab === "tahun") await academicDataApi.activateTahunSemester(id)
      if (tab === "kurikulum") await academicDataApi.activateKurikulum(id)
      toast.success(tab === "kurikulum" ? "Kurikulum berhasil diaktifkan." : "Tahun semester berhasil diaktifkan.")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan data.")
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    setError("")
    try {
      const { id, tab } = deleteTarget
      if (tab === "tahun") await academicDataApi.deleteTahunSemester(id, true)
      else if (tab === "kurikulum") await academicDataApi.deleteKurikulum(id, true)
      else if (tab === "semester") await academicDataApi.deleteSemester(id, true)
      else if (tab === "kelas") await academicDataApi.deleteKelas(id, true)
      else if (tab === "mata-kuliah") await academicDataApi.deleteMataKuliah(id, true)
      else if (tab === "kelas-mahasiswa") {
        if (isKelasMahasiswaDetail) {
          await academicDataApi.deleteKelasMahasiswa(id)
          toast.success("Mahasiswa berhasil dihapus dari kelas.")
        } else {
          await academicDataApi.deleteKelasSemester(id)
          toast.success("Kelas berhasil dihapus.")
        }
      } else if (tab === "kelas-praktikum") {
        await academicDataApi.deleteKelasPraktikum(id)
        toast.success("Kelas praktikum berhasil dihapus.")
      }
      if (tab !== "kelas-mahasiswa" && tab !== "kelas-praktikum") {
        toast.success("Data berhasil dihapus.")
      }
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus data."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function actionCell(tab: NativeTab, item: AcademicItem, label: string) {
    const statusItem = item as TahunSemester | Kurikulum
    const kelasPraktikumItem = item as KelasPraktikum

    return (
      <AdminActionCell>
        {tab === "tahun" && (
          <AdminButton variant="ghost" className="h-8 px-2" onClick={() => navigate(`/admin/academic/tahun-semester/${item.id}`)}>
            <Eye size={14} />
            Detail
          </AdminButton>
        )}
        {tab === "kelas-praktikum" && (
          <AdminButton variant="ghost" className="h-8 px-2" onClick={() => openDetail(kelasPraktikumItem)}>
            <Eye size={14} />
            Detail
          </AdminButton>
        )}

        {tab === "kurikulum" && statusItem.status !== "active" && (
          <AdminButton variant="ghost" className="h-8 px-2" disabled={submitting} onClick={() => activate(tab, item.id)}>
            Aktifkan
          </AdminButton>
        )}
        {!(tab === "kelas-mahasiswa" && isKelasMahasiswaDetail) && (
          <AdminButton variant="ghost" className="h-8 px-2" onClick={() => openModal(tab, item)}>
            Edit
          </AdminButton>
        )}
        <AdminButton variant="danger" className="h-8 px-2" disabled={submitting} onClick={() => setDeleteTarget({ tab, id: item.id, label })}>
          Hapus
        </AdminButton>
      </AdminActionCell>
    )
  }

  function renderKelasMahasiswa() {
    if (!groupedKelasMahasiswa.length) return <EmptyState title={emptyLabel("kelas-mahasiswa")} />
    const displayedData = groupedKelasMahasiswa.slice((page - 1) * limit, page * limit)
    return (
      <AdminTable headers={["Nama Kelas", "Jumlah Mahasiswa", "Aksi"]}>
        {displayedData.map((group) => {
          const displayClassName = formatKelasMahasiswaName(group)
          return (
            <tr key={`${group.id_semester}_${group.id_kelas}`}>
              <td className="px-4 py-3 font-semibold text-center">{displayClassName}</td>
              <td className="px-4 py-3 text-center">{group.students.length} mahasiswa</td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => {
                      navigate(`/admin/academic/tahun-semester/${tahunSemesterId}/kelas-mahasiswa?semesterId=${group.id_semester}&kelasId=${group.id_kelas}`)
                    }}
                  >
                    <Eye size={14} />
                    Detail
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => {
                      if (group.students.length > 0) {
                        toast.warning("Kelas tidak dapat diubah karena sudah memiliki mahasiswa.")
                        return
                      }
                      const isUsedInPraktikum = scopedKelasPraktikum.some(
                        (kp) => kp.id_semester === group.id_semester && kp.id_kelas === group.id_kelas
                      )
                      if (isUsedInPraktikum) {
                        toast.warning("Kelas tidak dapat diubah karena sudah digunakan oleh kelas praktikum.")
                        return
                      }
                      openModal("kelas-mahasiswa", group)
                    }}
                  >
                    Edit
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    className="h-8 px-2"
                    onClick={() => {
                      setDeleteTarget({
                        tab: "kelas-mahasiswa",
                        id: group.id,
                        label: displayClassName
                      })
                    }}
                  >
                    Hapus
                  </AdminButton>
                </div>
              </td>
            </tr>
          )
        })}
      </AdminTable>
    )
  }

  function renderKelasPraktikum(items: KelasPraktikum[] = filtered as KelasPraktikum[], isDetailView = false) {
    if (!items.length) return <EmptyState title="Belum ada kelas praktikum untuk tahun semester ini." />
    const headers = isDetailView
      ? ["Nama Kelas", "Jobsheet", "Pengampu", "Aksi"]
      : ["Nama Kelas", "Tahun Semester", "Mata Kuliah", "Semester", "Kelas", "Jobsheet", "Pengampu", "Aksi"]
    return (
      <AdminTable headers={headers}>
        {items.map((i) => {
          const lecturersForClass = pengampu.filter((item) => item.id_kelas_praktikum === i.id)
          const displayClassName = isDetailView ? formatKelasPraktikumName(i) : i.nama_kelas
          return (
            <tr key={i.id}>
              <td className="px-4 py-3 font-medium">{displayClassName}</td>
              {!isDetailView && <td className="px-4 py-3">{i.tahun_semester}</td>}
              {!isDetailView && <td className="px-4 py-3">{i.nama_mk}</td>}
              {!isDetailView && <td className="px-4 py-3 text-center">{i.semester}</td>}
              {!isDetailView && <td className="px-4 py-3 text-center">{i.kelas}</td>}
              <td className="px-4 py-3 text-sm">
                Rencana {i.jumlah_jobsheet_rencana ?? i.jumlahJobsheetRencana ?? 1} / Dibuat {i.jumlah_jobsheet_dibuat ?? i.jumlahJobsheetDibuat ?? 0} / Publish {i.jumlah_jobsheet_publish ?? i.jumlahJobsheetPublish ?? 0}
              </td>
              <td className="px-4 py-3">{lecturersForClass.map((item) => item.nama_dosen ?? item.fullname ?? item.id_dosen).join(", ") || "-"}</td>
              {actionCell("kelas-praktikum", i, displayClassName)}
            </tr>
          )
        })}
      </AdminTable>
    )
  }

  function renderTable() {
    if (activeTab === "kelas-mahasiswa") return renderKelasMahasiswa()
    if (!filtered.length) return <EmptyState title={emptyLabel(activeTab)} />

    const displayedData = filtered.slice((page - 1) * limit, page * limit)

    if (activeTab === "tahun") {
      return <AdminTable headers={["Tahun Semester", "Status Semester", "Aksi"]}>{(displayedData as TahunSemester[]).map((i) => <tr key={i.id}><td className="px-4 py-3 font-medium">{i.tahun_semester}</td><td className="px-4 py-3">{statusBadgeIndo(i.status)}</td>{actionCell("tahun", i, i.tahun_semester)}</tr>)}</AdminTable>
    }
    if (activeTab === "kurikulum") {
      return <AdminTable headers={["Tahun Kurikulum", "Nama Kurikulum", "Status Kurikulum", "Aksi"]}>{(displayedData as Kurikulum[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.tahun_kurikulum}</td><td className="px-4 py-3 font-medium">{i.nama_kurikulum}</td><td className="px-4 py-3">{statusBadgeIndo(i.status)}</td>{actionCell("kurikulum", i, i.nama_kurikulum)}</tr>)}</AdminTable>
    }
    if (activeTab === "semester") {
      return <AdminTable headers={["Semester", "Aksi"]}>{(displayedData as SemesterMaster[]).map((i) => <tr key={i.id}><td className="px-4 py-3">Semester {i.semester}</td>{actionCell("semester", i, `Semester ${i.semester}`)}</tr>)}</AdminTable>
    }
    if (activeTab === "kelas") {
      return <AdminTable headers={["Kelas", "Aksi"]}>{(displayedData as KelasMaster[]).map((i) => <tr key={i.id}><td className="px-4 py-3 font-semibold">{i.kelas}</td>{actionCell("kelas", i, i.kelas)}</tr>)}</AdminTable>
    }
    if (activeTab === "mata-kuliah") {
      return <AdminTable headers={["Kode", "Mata Kuliah", "SKS", "Tipe", "Semester", "Kurikulum", "Aksi"]}>{(displayedData as MataKuliah[]).map((i) => <tr key={i.id}><td className="px-4 py-3 font-mono">{i.kode_mk}</td><td className="px-4 py-3 font-medium">{i.nama_mk}</td><td className="px-4 py-3">{i.sks}</td><td className="px-4 py-3">{formatTipeLabel(i.tipe)}</td><td className="px-4 py-3">{i.semester}</td><td className="px-4 py-3">{i.nama_kurikulum}</td>{actionCell("mata-kuliah", i, i.nama_mk)}</tr>)}</AdminTable>
    }
    return renderKelasPraktikum(displayedData as KelasPraktikum[])
  }

  const option = (id: string, label: string) => <option key={id} value={id}>{label}</option>
  const formTab = modal?.tab ?? activeTab
  const currentWarning = getPrerequisiteWarning(activeTab)
  const addDisabled = Boolean(currentWarning)
  const showOperationalFilter = activeTab === "kelas-mahasiswa" || activeTab === "kelas-praktikum"

  function renderKelasPraktikumFields() {
    const hasKurikulum = Boolean(form.id_kurikulum)
    return (
      <>
        {!isTahunSemesterDetail && (
          <FieldRow label="Tahun Semester">
            <AdminSelect value={form.id_tahun_semester ?? ""} onChange={(v) => setField("id_tahun_semester", v)} required>
              <option value="">Pilih tahun semester</option>
              {tahunSemester.map((i) => option(i.id, `${i.tahun_semester}${formatActiveSuffix(i.status)}`))}
            </AdminSelect>
          </FieldRow>
        )}
        <FieldRow label="Kurikulum">
          <AdminSelect value={form.id_kurikulum ?? ""} onChange={(v) => setField("id_kurikulum", v)} required>
            <option value="">Pilih kurikulum aktif</option>
            {activeKurikulumList.map((i) => option(i.id, `${i.nama_kurikulum} (${i.tahun_kurikulum})`))}
          </AdminSelect>
        </FieldRow>
        <FieldRow label="Mata Kuliah">
          <AdminSelect
            value={form.id_mata_kuliah ?? ""}
            onChange={(v) => setField("id_mata_kuliah", v)}
            required
            disabled={!hasKurikulum || !mataKuliahPrioritized.length}
          >
            <option value="">
              {!hasKurikulum
                ? "Pilih kurikulum terlebih dahulu"
                : mataKuliahPrioritized.length
                  ? "Pilih mata kuliah"
                  : "Tidak ada mata kuliah sesuai kurikulum dan semester"}
            </option>
            {mataKuliahPrioritized.map((i) => option(i.id, `${i.kode_mk} - ${i.nama_mk} (Semester ${i.semester})`))}
          </AdminSelect>
        </FieldRow>
        {hasKurikulum && !mataKuliahPrioritized.length && warningBox("Tidak ada mata kuliah yang sesuai dengan kurikulum dan jenis semester tahun akademik ini.")}
        <FieldRow label="Semester Otomatis">
          <input className={`${inputClass} bg-gray-100 text-gray-700`} value={selectedSemester ? `Semester ${selectedSemester.semester}` : ""} readOnly disabled />
        </FieldRow>
        <FieldRow label="Kelas">
          <AdminSelect value={form.id_kelas ?? ""} onChange={(v) => setField("id_kelas", v)} required>
            <option value="">Pilih kelas</option>
            {kelas.map((i) => option(i.id, i.kelas))}
          </AdminSelect>
        </FieldRow>
        <FieldRow label="Dosen">
          <AdminSelect value={form.id_dosen ?? ""} onChange={(v) => setField("id_dosen", v)} required>
            <option value="">Pilih dosen</option>
            {lecturers.map((i) => option(i.id, `${i.nip ?? "-"} - ${i.fullname}`))}
          </AdminSelect>
        </FieldRow>

        <FieldRow label="Nama Kelas Otomatis">
          <input className={`${inputClass} bg-gray-100 text-gray-700`} value={generatedKelasPraktikumName} readOnly disabled />
        </FieldRow>
      </>
    )
  }

  function renderTahunSemesterFields() {
    const preview = form.tahun_awal && form.tahun_akhir && form.semester_type
      ? buildTahunSemester(form)
      : "Lengkapi tahun semester"

    return (
      <>
        <FieldRow label="Tahun Semester">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className={`${inputClass} sm:w-28`}
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={form.tahun_awal ?? ""}
              onChange={(e) => setField("tahun_awal", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2026"
              required
            />
            <span className="hidden text-gray-500 sm:inline">/</span>
            <input
              className={`${inputClass} sm:w-28`}
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={form.tahun_akhir ?? ""}
              onChange={(e) => setField("tahun_akhir", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2027"
              required
            />
            <AdminSelect value={form.semester_type ?? "Ganjil"} onChange={(v) => setField("semester_type", v)} required>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </AdminSelect>
          </div>
        </FieldRow>
        <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Akan disimpan sebagai: <span className="font-semibold">{preview}</span>
        </div>
      </>
    )
  }

  function renderModals() {
    return (
      <>
        {modal && (
          <AdminModal
            title={
              formTab === "kelas-mahasiswa" && isKelasMahasiswaDetail
                ? "Assign Mahasiswa"
                : `${modal.item ? "Edit" : "Tambah"} ${allTabs.find((item) => item.id === formTab)?.label.replace(/^\d+\.\s*/, "")}`
            }
            onClose={closeModal}
            footer={<><AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton><AdminButton disabled={submitting} type="submit" form="native-academic-form">{submitting ? "Menyimpan..." : "Simpan"}</AdminButton></>}
            size={formTab === "kelas-mahasiswa" && !isKelasMahasiswaDetail ? "sm" : "md"}
          >
            <form id="native-academic-form" className="space-y-4" onSubmit={submitForm}>
              {formTab === "tahun" && renderTahunSemesterFields()}
              {formTab === "kurikulum" && <><FieldRow label="Tahun Kurikulum"><input className={inputClass} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={form.tahun_kurikulum ?? ""} onChange={(e) => setField("tahun_kurikulum", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" required /></FieldRow><FieldRow label="Nama Kurikulum"><input className={inputClass} value={form.nama_kurikulum ?? ""} onChange={(e) => setField("nama_kurikulum", e.target.value)} placeholder="Kurikulum 2024" required /></FieldRow><FieldRow label="Status Kurikulum"><AdminSelect value={form.status ?? "inactive"} onChange={(v) => setField("status", v)}>{statusOptions.map((item) => option(item.value, item.label))}</AdminSelect></FieldRow></>}
              {formTab === "semester" && <FieldRow label="Semester"><input className={inputClass} type="number" min="1" value={form.semester ?? ""} onChange={(e) => setField("semester", e.target.value)} required /></FieldRow>}
              {formTab === "kelas" && <FieldRow label="Kelas/Rombel"><input className={inputClass} value={form.kelas ?? ""} onChange={(e) => setField("kelas", e.target.value)} placeholder="A" required /></FieldRow>}
              {formTab === "mata-kuliah" && <><FieldRow label="Kurikulum">{!activeKurikulum && warningBox("Aktifkan kurikulum terlebih dahulu sebelum menambahkan mata kuliah.")}<AdminSelect value={form.id_kurikulum ?? ""} onChange={(v) => setField("id_kurikulum", v)} required><option value="">Pilih kurikulum</option>{kurikulum.map((i) => option(i.id, `${i.nama_kurikulum} (${i.tahun_kurikulum})${formatActiveSuffix(i.status)}`))}</AdminSelect></FieldRow><FieldRow label="Semester">{!semester.length && warningBox("Tambahkan master semester terlebih dahulu sebelum menambahkan mata kuliah.")}<AdminSelect value={form.id_semester ?? ""} onChange={(v) => setField("id_semester", v)} required><option value="">Pilih semester</option>{semester.map((i) => option(i.id, `Semester ${i.semester}`))}</AdminSelect></FieldRow><FieldRow label="Kode MK"><input className={inputClass} value={form.kode_mk ?? ""} onChange={(e) => setField("kode_mk", e.target.value)} required /></FieldRow><FieldRow label="Nama MK"><input className={inputClass} value={form.nama_mk ?? ""} onChange={(e) => setField("nama_mk", e.target.value)} required /></FieldRow><FieldRow label="SKS"><input className={inputClass} type="number" min="1" value={form.sks ?? ""} onChange={(e) => setField("sks", e.target.value)} required /></FieldRow><FieldRow label="Tipe"><AdminSelect value={form.tipe ?? "Praktikum"} onChange={(v) => setField("tipe", v)}>{tipeOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
              {formTab === "kelas-mahasiswa" && (
                <>
                  {isKelasMahasiswaDetail ? (
                    <>
                      {modal.item ? (
                        <FieldRow label="Mahasiswa">
                          <input
                            className={`${inputClass} bg-gray-100 text-gray-700`}
                            value={`${(modal.item as KelasMahasiswa).nim ?? "-"} - ${(modal.item as KelasMahasiswa).fullname ?? ""}`}
                            readOnly
                            disabled
                          />
                        </FieldRow>
                      ) : (
                        <>
                          <FieldRow label="Cari Mahasiswa">
                            <input
                              className={inputClass}
                              value={searchMahasiswa}
                              onChange={(e) => setSearchMahasiswa(e.target.value)}
                              placeholder="Cari NIM atau nama mahasiswa..."
                            />
                          </FieldRow>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Daftar Mahasiswa</label>
                            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 p-2 space-y-1 bg-white">
                              {filteredMahasiswa.length > 0 ? (
                                filteredMahasiswa.map((student) => {
                                  const isChecked = selectedMahasiswaIds.includes(student.id)
                                  return (
                                    <label
                                      key={student.id}
                                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={isChecked}
                                        onChange={() => {
                                          setSelectedMahasiswaIds((prev) => {
                                            if (prev.includes(student.id)) {
                                              return prev.filter((id) => id !== student.id)
                                            } else {
                                              return [...prev, student.id]
                                            }
                                          })
                                        }}
                                      />
                                      <span className="text-gray-900 font-medium">
                                        {student.nim ?? "-"} — {student.fullname}
                                      </span>
                                    </label>
                                  )
                                })
                              ) : (
                                <div className="px-3 py-4 text-center text-sm text-gray-500">
                                  {students.filter((s) => !existingStudentIds.has(s.id)).length === 0
                                    ? "Semua mahasiswa yang tersedia sudah terdaftar di kelas ini."
                                    : "Tidak ada mahasiswa yang cocok."}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <FieldRow label="Semester">
                        <AdminSelect
                          value={form.id_semester ?? ""}
                          onChange={(v) => setField("id_semester", v)}
                          required
                        >
                          <option value="">Pilih semester</option>
                          {filteredSemestersForModal.map((i) => option(i.id, `Semester ${i.semester}`))}
                        </AdminSelect>
                      </FieldRow>
                      <FieldRow label="Kelas / Rombel">
                        <AdminSelect
                          value={form.id_kelas ?? ""}
                          onChange={(v) => setField("id_kelas", v)}
                          required
                        >
                          <option value="">Pilih kelas</option>
                          {kelas.map((i) => option(i.id, i.kelas))}
                        </AdminSelect>
                      </FieldRow>
                    </>
                  )}
                </>
              )}
              {formTab === "kelas-praktikum" && renderKelasPraktikumFields()}
            </form>
          </AdminModal>
        )}

        {detail && (
          <AdminModal
            title="Detail Kelas Praktikum"
            onClose={() => {
              setDetail(null)
              if (kelasPraktikumDetailId) navigate("/admin/academic/kelas-praktikum")
            }}
            footer={<AdminButton onClick={() => {
              setDetail(null)
              if (kelasPraktikumDetailId) navigate("/admin/academic/kelas-praktikum")
            }}>Tutup</AdminButton>}
          >
            <div className="space-y-5">
              <AdminPanel className="p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Informasi Kelas Praktikum</h3>
                <dl className="grid gap-2 text-sm md:grid-cols-[160px_1fr]">
                  <dt className="text-gray-500">Tahun Semester</dt><dd>{detail.tahun_semester}</dd>
                  <dt className="text-gray-500">Mata Kuliah</dt><dd>{detail.kode_mk} - {detail.nama_mk}</dd>
                  <dt className="text-gray-500">Semester</dt><dd>{detail.semester}</dd>
                  <dt className="text-gray-500">Kelas</dt><dd>{detail.kelas}</dd>
                  <dt className="text-gray-500">Nama Kelas</dt><dd>{detail.nama_kelas}</dd>
                  <dt className="text-gray-500">Status</dt><dd>{statusBadge(detail.status)}</dd>
                  <dt className="text-gray-500">Jobsheet Rencana</dt><dd>{detail.jumlah_jobsheet_rencana ?? detail.jumlahJobsheetRencana ?? 1}</dd>
                  <dt className="text-gray-500">Jobsheet Dibuat</dt><dd>{detail.jumlah_jobsheet_dibuat ?? detail.jumlahJobsheetDibuat ?? 0}</dd>
                  <dt className="text-gray-500">Jobsheet Publish</dt><dd>{detail.jumlah_jobsheet_publish ?? detail.jumlahJobsheetPublish ?? 0}</dd>
                  <dt className="text-gray-500">Dosen</dt><dd>{detailPengampu.map((item) => item.nama_dosen ?? item.fullname ?? item.id_dosen).join(", ") || "-"}</dd>
                </dl>
              </AdminPanel>
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Daftar Mahasiswa</h3>
                {detailLoading ? <p className="text-sm text-gray-500">Memuat mahasiswa kelas praktikum...</p> : detailStudents.length ? (
                  <AdminTable headers={["NIM", "Nama", "Email", "Status"]}>
                    {detailStudents.map((student) => (
                      <tr key={student.id}><td className="px-4 py-3 font-mono">{student.nim ?? "-"}</td><td className="px-4 py-3">{student.fullname ?? student.id_mahasiswa}</td><td className="px-4 py-3">{student.email ?? "-"}</td><td className="px-4 py-3">{statusBadge(student.status)}</td></tr>
                    ))}
                  </AdminTable>
                ) : <EmptyState title="Belum ada mahasiswa untuk semester dan kelas ini." />}
              </div>
            </div>
          </AdminModal>
        )}

        {deleteTarget && (() => {
          const warningKey = deleteTarget.tab === "kelas-mahasiswa" && isKelasMahasiswaDetail
            ? "kelas-mahasiswa-detail"
            : deleteTarget.tab === "kelas-mahasiswa"
              ? "kelas-semester"
              : deleteTarget.tab
          const warningText = tabDeleteWarning[warningKey as keyof typeof tabDeleteWarning] ?? ""
          return (
            <AdminConfirmModal
              title="Hapus Data Secara Permanen?"
              message={
                <div className="space-y-3 text-left">
                  <p className="font-semibold text-gray-900">
                    Anda akan menghapus: <span className="text-red-600">{deleteTarget.label}</span>
                  </p>
                  {warningText && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      ⚠️ {warningText}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan?
                  </p>
                </div>
              }
              confirmLabel="Hapus Permanen"
              variant="danger"
              loading={submitting}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={confirmDelete}
            />
          )
        })()}
      </>
    )
  }

  function renderPromotionModals() {
    const selectedStudents = activePromotionStudents.filter((student) => selectedPromotionIds.includes(student.id_mahasiswa))
    const closeWizard = () => {
      if (submittingPromotion) return
      setIsPromotionWizardOpen(false)
      setIsPromotionConfirmOpen(false)
      setPromotionSubmitError("")
    }
    return (
      <>
        {isPromotionWizardOpen && (
          <AdminModal
            title="Kenaikan Semester Mahasiswa"
            size="lg"
            onClose={closeWizard}
            footer={
              <>
                <AdminButton variant="secondary" onClick={closeWizard} disabled={submittingPromotion}>Batal</AdminButton>
                <AdminButton id="promotion-process-button" onClick={handlePromotionSubmit} disabled={submittingPromotion || !selectedPromotionIds.length}>
                  Proses Kenaikan Semester
                </AdminButton>
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{selectedPromotionIds.length} dari {activePromotionStudents.length} mahasiswa aktif dipilih.</p>
                <div className="flex gap-2">
                  <AdminButton variant="secondary" onClick={() => setSelectedPromotionIds(activePromotionStudents.map((student) => student.id_mahasiswa))}>
                    Pilih Semua
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setSelectedPromotionIds([])}>
                    Kosongkan
                  </AdminButton>
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Mahasiswa</th>
                      <th className="px-4 py-3">Semester Saat Ini</th>
                      <th className="px-4 py-3">Semester Tujuan</th>
                      <th className="px-4 py-3">Kelas Asal</th>
                      <th className="px-4 py-3">Target Kelas</th>
                      <th className="px-4 py-3">Pilih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {activePromotionStudents.map((student) => {
                      const currentSemester = Number(student.student_semester ?? student.semester)
                      const targetOptions = getPromotionTargetOptions(student)
                      const target = promotionTargets[student.id_mahasiswa]?.targetKelasSemesterId ?? ""
                      return (
                        <tr key={student.id_mahasiswa}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{student.fullname ?? student.id_mahasiswa}</p>
                            <p className="text-xs text-gray-500">{student.nim ?? "-"}</p>
                          </td>
                          <td className="px-4 py-3">{currentSemester}</td>
                          <td className="px-4 py-3">{currentSemester + 1}</td>
                          <td className="px-4 py-3">{student.kelas ?? currentKelasSemester?.kelas ?? "-"}</td>
                          <td className="px-4 py-3">
                            <AdminSelect
                              value={target}
                              onChange={(value) => updatePromotionTarget(student.id_mahasiswa, { targetKelasSemesterId: value })}
                              disabled={!targetOptions.length}
                            >
                              <option value="">Pilih kelas tujuan</option>
                              {targetOptions.map((item) => option(item.id, `Semester ${item.semester} Kelas ${item.kelas}`))}
                            </AdminSelect>
                            {!targetOptions.length && (
                              <p className="mt-1 text-xs text-red-600">Kelas tujuan pada semester berikutnya belum tersedia. Silakan buat kelas tujuan terlebih dahulu.</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPromotionIds.includes(student.id_mahasiswa)}
                              onChange={(event) => togglePromotionStudent(student.id_mahasiswa, event.target.checked)}
                              disabled={!targetOptions.length}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {promotionSubmitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{promotionSubmitError}</div>
              )}
            </div>
          </AdminModal>
        )}
        {isPromotionConfirmOpen && (
          <AdminModal
            title="Konfirmasi Kenaikan Semester"
            onClose={() => {
              if (submittingPromotion) return
              setIsPromotionConfirmOpen(false)
            }}
            footer={
              <>
                <AdminButton variant="secondary" onClick={() => setIsPromotionConfirmOpen(false)} disabled={submittingPromotion}>Batal</AdminButton>
                <AdminButton onClick={processPromotion} disabled={submittingPromotion}>
                  {submittingPromotion && <Loader2 size={16} className="animate-spin" />}
                  {submittingPromotion ? "Memproses..." : "Ya, Proses"}
                </AdminButton>
              </>
            }
          >
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700"><AlertTriangle size={20} /></div>
                <p className="font-semibold text-gray-900">Anda akan menaikkan {selectedStudents.length} mahasiswa aktif tepat satu semester.</p>
              </div>
              <p>Semester profil mahasiswa diperbarui dan relasi kelas lama tetap disimpan sebagai riwayat.</p>
              {promotionSubmitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{promotionSubmitError}</div>
              )}
            </div>
          </AdminModal>
        )}
      </>
    )
  }

  function renderKelasMahasiswaDetail() {
    if (loading) {
      return (
        <AdminLayout>
          <p className="text-sm text-gray-500">Memuat detail kelas mahasiswa...</p>
        </AdminLayout>
      )
    }

    if (!detailTahunSemester) {
      return (
        <AdminLayout>
          <EmptyState title="Tahun semester tidak ditemukan." />
        </AdminLayout>
      )
    }

    const currentSemesterObj = semester.find((s) => s.id === paramSemesterId)
    const currentKelasObj = kelas.find((k) => k.id === paramKelasId)
    const semName = currentSemesterObj?.semester ?? ""
    const klsName = currentKelasObj?.kelas ?? ""
    const displayClassName = formatKelasMahasiswaName({ semester_num: semName, kelas_name: klsName })
    const headerTitle = `${displayClassName} — ${detailTahunSemester.tahun_semester}`

    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <button
              type="button"
              className="mb-3 flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
              onClick={() => navigate(`/admin/academic/tahun-semester/${tahunSemesterId}`)}
            >
              <ArrowLeft size={16} />
              Kembali
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-500">
              Daftar mahasiswa pada Semester {semName} Kelas {klsName} untuk tahun semester {detailTahunSemester.tahun_semester}.
            </p>
          </div>

          <AdminPanel>
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Daftar Mahasiswa</h2>
                <p className="text-sm text-gray-500">{filteredClassStudents.length} mahasiswa terdaftar</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <AdminSearchInput value={detailKelasMahasiswaSearch} onChange={setDetailKelasMahasiswaSearch} placeholder="Cari NIM atau nama" />
                <AdminButton variant="secondary" onClick={openPromotionWizard} disabled={!activePromotionStudents.length || !currentKelasSemester}>
                  Kenaikan Semester
                </AdminButton>
                <AdminButton onClick={() => openModal("kelas-mahasiswa")} disabled={Boolean(getPrerequisiteWarning("kelas-mahasiswa"))}>
                  <Plus size={16} />
                  Assign Mahasiswa
                </AdminButton>
              </div>
            </div>
            <div className="p-4">
              {filteredClassStudents.length ? (
                <AdminTable headers={["NIM", "Nama", "Aksi"]}>
                  {filteredClassStudents.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-mono">{item.nim ?? "-"}</td>
                      <td className="px-4 py-3">{item.fullname ?? item.id_mahasiswa}</td>
                      {actionCell("kelas-mahasiswa", item, item.fullname ?? item.id_mahasiswa)}
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada mahasiswa di kelas ini." />
              )}
            </div>
          </AdminPanel>
        </div>
        {renderModals()}
        {renderPromotionModals()}
      </AdminLayout>
    )
  }

  function renderTahunSemesterDetail() {
    if (loading) {
      return (
        <AdminLayout>
          <p className="text-sm text-gray-500">Memuat detail tahun semester...</p>
        </AdminLayout>
      )
    }

    if (!detailTahunSemester) {
      return (
        <AdminLayout>
          <EmptyState title="Tahun semester tidak ditemukan." />
        </AdminLayout>
      )
    }

    const filteredKelasPraktikum = scopedKelasPraktikum.filter((item) => {
      const displayClassName = formatKelasPraktikumName(item)
      const lecturersForClass = pengampu.filter((p) => p.id_kelas_praktikum === item.id)
      const lecturersName = lecturersForClass.map((p) => p.nama_dosen ?? p.fullname ?? p.id_dosen).join(", ")
      return includesKeyword(
        [displayClassName, lecturersName, item.status],
        kelasPraktikumSearch
      )
    })

    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                type="button"
                className="mb-3 flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
                onClick={() => navigate("/admin/academic/tahun-semester")}
              >
                <ArrowLeft size={16} />
                Kembali
              </button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">{detailTahunSemester.tahun_semester}</h1>
                {statusBadge(detailTahunSemester.status)}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {groupedKelasMahasiswa.length} kelas mahasiswa • {scopedKelasPraktikum.length} kelas praktikum
              </p>
            </div>
            <div className="flex items-center gap-2">
              {detailTahunSemester.status !== "active" && (
                <AdminButton variant="secondary" disabled={submitting} onClick={() => activate("tahun", detailTahunSemester.id)}>
                  Aktifkan
                </AdminButton>
              )}
            </div>
          </div>
          <AdminTabs
            tabs={[
              { id: "mahasiswa", label: "Kelas Mahasiswa" },
              { id: "praktikum", label: "Kelas Praktikum" },
            ]}
            active={localTab}
            onChange={setLocalTab}
          />

          {localTab === "mahasiswa" && (
            <AdminPanel>
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Kelas Mahasiswa</h2>
                  <p className="text-sm text-gray-500">Posisi mahasiswa pada semester dan rombel untuk tahun semester ini.</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <AdminSearchInput value={kelasMahasiswaSearch} onChange={setKelasMahasiswaSearch} placeholder="Cari kelas" />
                  <AdminButton onClick={() => openModal("kelas-mahasiswa")} disabled={Boolean(getPrerequisiteWarning("kelas-mahasiswa"))}>
                    <Plus size={16} />
                    Tambah Kelas Mahasiswa
                  </AdminButton>
                </div>
              </div>
              <div className="p-4">
                {groupedKelasMahasiswa.length ? renderKelasMahasiswa() : (
                  <EmptyState title="Belum ada kelas mahasiswa untuk tahun semester ini." />
                )}
              </div>
            </AdminPanel>
          )}

          {localTab === "praktikum" && (
            <AdminPanel>
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Kelas Praktikum</h2>
                  <p className="text-sm text-gray-500">Pembukaan mata kuliah praktikum, kelas/rombel, dan dosen pengampu untuk tahun semester ini.</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <AdminSearchInput value={kelasPraktikumSearch} onChange={setKelasPraktikumSearch} placeholder="Cari kelas praktikum" />
                  <AdminButton onClick={() => openModal("kelas-praktikum")} disabled={Boolean(getPrerequisiteWarning("kelas-praktikum"))}>
                    <Plus size={16} />
                    Tambah Kelas Praktikum
                  </AdminButton>
                </div>
              </div>
              <div className="p-4">{renderKelasPraktikum(filteredKelasPraktikum, true)}</div>
            </AdminPanel>
          )}
        </div>
        {renderModals()}
        {renderPromotionModals()}
      </AdminLayout>
    )
  }

  if (isDashboard) {
    return <Navigate to="/admin/academic/tahun-semester" replace />
  }

  if (isKelasMahasiswaDetail) {
    return renderKelasMahasiswaDetail()
  }

  if (isTahunSemesterDetail) {
    return renderTahunSemesterDetail()
  }

  return (
    <AdminLayout>
      <AdminSectionHeader
        eyebrow="Data Akademik"
        title={activeTabMeta.title}
        description={activeTabMeta.description}
        actions={
          <>
            {showOperationalFilter && (
              <AdminSelect
                label="Tahun Semester"
                value={selectedOperationalTahunSemester?.id ?? ""}
                onChange={setOperationalTahunSemesterId}
                className="w-full md:w-56"
              >
                <option value="">Pilih tahun semester</option>
                {tahunSemester.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tahun_semester}{formatActiveSuffix(item.status)}
                  </option>
                ))}
              </AdminSelect>
            )}
            <AdminSearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder={searchPlaceholder[activeTab]}
            />
            <AdminButton disabled={addDisabled} title={currentWarning || "Tambah data"} onClick={() => openModal(activeTab)}>
              <Plus size={16} />
              {activeTabMeta.addLabel}
            </AdminButton>
          </>
        }
      />
      <div className="space-y-6">
        {currentWarning && warningBox(currentWarning)}

        <AdminPanel>
          <div className="p-4">
            {renderTable()}
            {(() => {
              const totalItems = activeTab === "kelas-mahasiswa" ? groupedKelasMahasiswa.length : filtered.length
              return renderPagination(page, Math.ceil(totalItems / limit), setPage, totalItems)
            })()}
          </div>
        </AdminPanel>
      </div>

      {modal && (
        <AdminModal
          title={
            formTab === "kelas-mahasiswa" && isKelasMahasiswaDetail
              ? "Assign Mahasiswa"
              : `${modal.item ? "Edit" : "Tambah"} ${allTabs.find((item) => item.id === formTab)?.label.replace(/^\d+\.\s*/, "")}`
          }
          onClose={closeModal}
          footer={<><AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton><AdminButton disabled={submitting} type="submit" form="native-academic-form">{submitting ? "Menyimpan..." : "Simpan"}</AdminButton></>}
          size={formTab === "kelas-mahasiswa" && !isKelasMahasiswaDetail ? "sm" : "md"}
        >
          <form id="native-academic-form" className="space-y-4" onSubmit={submitForm}>
            {formTab === "tahun" && renderTahunSemesterFields()}
            {formTab === "kurikulum" && <><FieldRow label="Tahun Kurikulum"><input className={inputClass} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={form.tahun_kurikulum ?? ""} onChange={(e) => setField("tahun_kurikulum", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" required /></FieldRow><FieldRow label="Nama Kurikulum"><input className={inputClass} value={form.nama_kurikulum ?? ""} onChange={(e) => setField("nama_kurikulum", e.target.value)} placeholder="Kurikulum 2024" required /></FieldRow><FieldRow label="Status Kurikulum"><AdminSelect value={form.status ?? "inactive"} onChange={(v) => setField("status", v)}>{statusOptions.map((item) => option(item.value, item.label))}</AdminSelect></FieldRow></>}
            {formTab === "semester" && <FieldRow label="Semester"><input className={inputClass} type="number" min="1" value={form.semester ?? ""} onChange={(e) => setField("semester", e.target.value)} required /></FieldRow>}
            {formTab === "kelas" && <FieldRow label="Kelas/Rombel"><input className={inputClass} value={form.kelas ?? ""} onChange={(e) => setField("kelas", e.target.value)} placeholder="A" required /></FieldRow>}
            {formTab === "mata-kuliah" && <><FieldRow label="Kurikulum">{!activeKurikulum && warningBox("Aktifkan kurikulum terlebih dahulu sebelum menambahkan mata kuliah.")}<AdminSelect value={form.id_kurikulum ?? ""} onChange={(v) => setField("id_kurikulum", v)} required><option value="">Pilih kurikulum</option>{kurikulum.map((i) => option(i.id, `${i.nama_kurikulum} (${i.tahun_kurikulum})${formatActiveSuffix(i.status)}`))}</AdminSelect></FieldRow><FieldRow label="Semester">{!semester.length && warningBox("Tambahkan master semester terlebih dahulu sebelum menambahkan mata kuliah.")}<AdminSelect value={form.id_semester ?? ""} onChange={(v) => setField("id_semester", v)} required><option value="">Pilih semester</option>{semester.map((i) => option(i.id, `Semester ${i.semester}`))}</AdminSelect></FieldRow><FieldRow label="Kode MK"><input className={inputClass} value={form.kode_mk ?? ""} onChange={(e) => setField("kode_mk", e.target.value)} required /></FieldRow><FieldRow label="Nama MK"><input className={inputClass} value={form.nama_mk ?? ""} onChange={(e) => setField("nama_mk", e.target.value)} required /></FieldRow><FieldRow label="SKS"><input className={inputClass} type="number" min="1" value={form.sks ?? ""} onChange={(e) => setField("sks", e.target.value)} required /></FieldRow><FieldRow label="Tipe"><AdminSelect value={form.tipe ?? "praktikum"} onChange={(v) => setField("tipe", v)}>{tipeOptions.map((v) => option(v.value, v.label))}</AdminSelect></FieldRow></>}
            {formTab === "kelas-mahasiswa" && (
              <>
                {isKelasMahasiswaDetail ? (
                  <>
                    {modal.item ? (
                      <FieldRow label="Mahasiswa">
                        <input
                          className={`${inputClass} bg-gray-100 text-gray-700`}
                          value={`${(modal.item as KelasMahasiswa).nim ?? "-"} - ${(modal.item as KelasMahasiswa).fullname ?? ""}`}
                          readOnly
                          disabled
                        />
                      </FieldRow>
                    ) : (
                      <>
                        <FieldRow label="Cari Mahasiswa">
                          <input
                            className={inputClass}
                            value={searchMahasiswa}
                            onChange={(e) => setSearchMahasiswa(e.target.value)}
                            placeholder="Cari NIM atau nama mahasiswa..."
                          />
                        </FieldRow>
                        <div className="rounded-md border border-blue-100 bg-blue-50 p-2.5 text-xs text-blue-800">
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                              checked={isPindahan}
                              onChange={(e) => setIsPindahan(e.target.checked)}
                            />
                            Tampilkan Mahasiswa Pindahan (Abaikan validasi kesesuaian semester)
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Daftar Mahasiswa</label>
                          <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 p-2 space-y-1 bg-white">
                            {filteredMahasiswa.length > 0 ? (
                              filteredMahasiswa.map((student) => {
                                const isChecked = selectedMahasiswaIds.includes(student.id)
                                return (
                                  <label
                                    key={student.id}
                                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSelectedMahasiswaIds((prev) => {
                                          if (prev.includes(student.id)) {
                                            return prev.filter((id) => id !== student.id)
                                          } else {
                                            return [...prev, student.id]
                                          }
                                        })
                                      }}
                                    />
                                    <span className="text-gray-900 font-medium">
                                      {student.nim ?? "-"} — {student.fullname}
                                    </span>
                                  </label>
                                )
                              })
                            ) : (
                              <div className="px-3 py-4 text-center text-sm text-gray-500">
                                {students.filter((s) => !existingStudentIds.has(s.id)).length === 0
                                  ? "Semua mahasiswa yang tersedia sudah terdaftar di kelas ini."
                                  : "Tidak ada mahasiswa yang cocok."}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <FieldRow label="Semester">
                      <AdminSelect
                        value={form.id_semester ?? ""}
                        onChange={(v) => setField("id_semester", v)}
                        required
                      >
                        <option value="">Pilih semester</option>
                        {filteredSemestersForModal.map((i) => option(i.id, `Semester ${i.semester}`))}
                      </AdminSelect>
                    </FieldRow>
                    <FieldRow label="Kelas / Rombel">
                      <AdminSelect
                        value={form.id_kelas ?? ""}
                        onChange={(v) => setField("id_kelas", v)}
                        required
                      >
                        <option value="">Pilih kelas</option>
                        {kelas.map((i) => option(i.id, i.kelas))}
                      </AdminSelect>
                    </FieldRow>
                  </>
                )}
              </>
            )}
            {formTab === "kelas-praktikum" && renderKelasPraktikumFields()}
          </form>
        </AdminModal>
      )}

      {detail && (
        <AdminModal
          title="Detail Kelas Praktikum"
          onClose={() => {
            setDetail(null)
            if (detailId) navigate("/admin/academic/kelas-praktikum")
          }}
          footer={<AdminButton onClick={() => {
            setDetail(null)
            if (detailId) navigate("/admin/academic/kelas-praktikum")
          }}>Tutup</AdminButton>}
        >
          <div className="space-y-5">
            <AdminPanel className="p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Informasi Kelas Praktikum</h3>
              <dl className="grid gap-2 text-sm md:grid-cols-[160px_1fr]">
                <dt className="text-gray-500">Tahun Semester</dt><dd>{detail.tahun_semester}</dd>
                <dt className="text-gray-500">Mata Kuliah</dt><dd>{detail.kode_mk} - {detail.nama_mk}</dd>
                <dt className="text-gray-500">Semester</dt><dd>{detail.semester}</dd>
                <dt className="text-gray-500">Kelas</dt><dd>{detail.kelas}</dd>
                <dt className="text-gray-500">Nama Kelas</dt><dd>{detail.nama_kelas}</dd>
                <dt className="text-gray-500">Status</dt><dd>{statusBadge(detail.status)}</dd>
                <dt className="text-gray-500">Jobsheet Rencana</dt><dd>{detail.jumlah_jobsheet_rencana ?? detail.jumlahJobsheetRencana ?? 1}</dd>
                <dt className="text-gray-500">Jobsheet Dibuat</dt><dd>{detail.jumlah_jobsheet_dibuat ?? detail.jumlahJobsheetDibuat ?? 0}</dd>
                <dt className="text-gray-500">Jobsheet Publish</dt><dd>{detail.jumlah_jobsheet_publish ?? detail.jumlahJobsheetPublish ?? 0}</dd>
                <dt className="text-gray-500">Dosen</dt><dd>{detailPengampu.map((item) => item.nama_dosen ?? item.fullname ?? item.id_dosen).join(", ") || "-"}</dd>
              </dl>
            </AdminPanel>
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Daftar Mahasiswa</h3>
              {detailLoading ? (
                <p className="text-sm text-gray-500">Memuat mahasiswa kelas praktikum...</p>
              ) : detailStudents.length ? (
                <AdminTable headers={["NIM", "Nama", "Email", "Status"]}>
                  {detailStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-mono">{student.nim ?? "-"}</td>
                      <td className="px-4 py-3">{student.fullname ?? student.id_mahasiswa}</td>
                      <td className="px-4 py-3">{student.email ?? "-"}</td>
                      <td className="px-4 py-3">{statusBadgeIndo(student.status)}</td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyState title="Belum ada mahasiswa yang cocok dengan tahun semester, semester, dan kelas praktikum ini." />
              )}
            </div>
          </div>
        </AdminModal>
      )}
      {deleteTarget && (() => {
        const warningKey = deleteTarget.tab === "kelas-mahasiswa" && isKelasMahasiswaDetail
          ? "kelas-mahasiswa-detail"
          : deleteTarget.tab === "kelas-mahasiswa"
            ? "kelas-semester"
            : deleteTarget.tab
        const warningText = tabDeleteWarning[warningKey as keyof typeof tabDeleteWarning] ?? ""
        return (
          <AdminConfirmModal
            title="Hapus Data Secara Permanen?"
            message={
              <div className="space-y-3 text-left">
                <p className="font-semibold text-gray-900">
                  Anda akan menghapus: <span className="text-red-600">{deleteTarget.label}</span>
                </p>
                {warningText && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    ⚠️ {warningText}
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan?
                </p>
              </div>
            }
            confirmLabel="Hapus Permanen"
            variant="danger"
            loading={submitting}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
          />
        )
      })()}
    </AdminLayout>
  )
}
