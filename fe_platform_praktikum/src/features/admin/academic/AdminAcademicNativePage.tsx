import { ArrowRight, Eye, Loader2, Plus, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import TopProgressBar from "../../../components/loading/TopProgressBar"
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
import KurikulumTab from "./tabs/KurikulumTab"
import SemesterTab from "./tabs/SemesterTab"
import MataKuliahTab from "./tabs/MataKuliahTab"
import TahunSemesterTab from "./tabs/TahunSemesterTab"
import KelasTab from "./tabs/KelasTab"
import KelasMahasiswaTab from "./tabs/KelasMahasiswaTab"
import KelasPraktikumTab from "./tabs/KelasPraktikumTab"
import KenaikanSemesterTab from "./tabs/KenaikanSemesterTab"
import KenaikanSemesterModal from "./tabs/KenaikanSemesterModal"
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
  type MataKuliahTipe,
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
  | "kenaikan-semester"

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
type ActivateTarget = { tab: NativeTab; id?: string; label: string; pendingForm?: FormState } | null
type DeleteTarget = { tab: NativeTab; id: string; label: string } | null

const allTabs: Array<{ id: NativeTab; label: string }> = [
  { id: "kurikulum", label: "Kurikulum" },
  { id: "semester", label: "Semester" },
  { id: "mata-kuliah", label: "Mata Kuliah" },
  { id: "tahun", label: "Tahun Semester" },
  { id: "kelas", label: "Kelas" },
  { id: "kelas-mahasiswa", label: "Kelas Mahasiswa" },
  { id: "kelas-praktikum", label: "Kelas Praktikum" },
  { id: "kenaikan-semester", label: "Kenaikan Semester" },
]
const statusOptions: Array<{ label: string; value: AcademicStatus }> = [
  { label: "Aktif", value: "active" },
  { label: "Tidak Aktif", value: "inactive" },
]

const routeToTab: Record<string, NativeTab> = {
  "tahun-semester": "tahun",
  kurikulum: "kurikulum",
  semester: "semester",
  kelas: "kelas",
  "mata-kuliah": "mata-kuliah",
  "kelas-mahasiswa": "kelas-mahasiswa",
  "kelas-praktikum": "kelas-praktikum",
  "kenaikan-semester": "kenaikan-semester",
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
  "kenaikan-semester": {
    title: "Kenaikan Semester",
    description: "Atur kenaikan semester mahasiswa antar kelas rombel secara bertahap.",
    addLabel: "Proses Kenaikan Semester",
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
  "kenaikan-semester": "Cari kelas atau rombel",
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
    inactive: "Nonaktif",
  }

  return map[status ?? ""] ?? "Nonaktif"
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
  const [activateTarget, setActivateTarget] = useState<ActivateTarget>(null)
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
  const [promotionSubmitError, setPromotionSubmitError] = useState("")
  const [submittingPromotion, setSubmittingPromotion] = useState(false)

  // 2-Column Kenaikan Semester states
  const [promotionSourceKsId, setPromotionSourceKsId] = useState<string>("")
  const [promotionTargetKsId, setPromotionTargetKsId] = useState<string>("")
  const [checkedSourceStudentIds, setCheckedSourceStudentIds] = useState<string[]>([])
  const [promotedStudentsMap, setPromotedStudentsMap] = useState<
    Record<string, { student: KelasMahasiswa; targetKsId: string; targetLabel: string }>
  >({})

  function renderPagination(currentPage: number, totalPages: number, onPageChange: (p: number) => void, totalItems: number) {
    if (totalItems <= limit) return null

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
  const validTahunSemesterId = tahunSemesterId && tahunSemesterId !== "undefined" ? tahunSemesterId : undefined
  const detailTahunSemester = useMemo(() => {
    if (isTahunSemesterDetail && validTahunSemesterId) {
      return tahunSemester.find((item) => item.id === validTahunSemesterId) ?? null
    }
    return activeTahunSemester ?? tahunSemester[0] ?? null
  }, [isTahunSemesterDetail, validTahunSemesterId, activeTahunSemester, tahunSemester])

  const selectedOperationalTahunSemester = detailTahunSemester

  const currentSemesterType = useMemo(() => {
    const ts = detailTahunSemester ?? selectedOperationalTahunSemester
    if (!ts) return null
    const name = ts.tahun_semester || ""
    if (/genap/i.test(name)) return "Genap"
    if (/ganjil/i.test(name)) return "Ganjil"
    console.warn("Format tahun semester tidak dikenali:", name)
    return null
  }, [detailTahunSemester, selectedOperationalTahunSemester])

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
    setTahunSemester((prev) => {
      if (prev.length === 0) setLoading(true)
      return prev
    })
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
    if (!kelasPraktikumDetailId || !kelasPraktikum.length || detail?.id === kelasPraktikumDetailId) return
    const item = kelasPraktikum.find((entry) => entry.id === kelasPraktikumDetailId)
    if (item) {
      openDetail(item)
    }
  }, [kelasPraktikumDetailId, kelasPraktikum, detail?.id, openDetail])



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
      return {
        ...parseTahunSemester(tahunItem?.tahun_semester),
        status: normalizeAcademicStatus(tahunItem?.status),
      }
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
      jumlah_jobsheet_rencana: String(kelasPraktikumItem?.jumlah_jobsheet_rencana ?? kelasPraktikumItem?.jumlahJobsheetRencana ?? 0),
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
      if (!activeTahunSemester) return "Belum ada tahun semester yang aktif. Silakan aktifkan tahun semester terlebih dahulu pada tab Tahun Semester."
      if (!semester.length) return "Tambahkan master semester terlebih dahulu."
      if (!kelas.length) return "Tambahkan master kelas/rombel terlebih dahulu."
      if (!lecturers.length && !students.length) return "Belum ada dosen dan mahasiswa yang terdaftar di sistem. Silakan tambahkan user dosen dan mahasiswa terlebih dahulu."
      if (!students.length) return "Belum ada mahasiswa yang terdaftar di sistem. Silakan tambahkan user mahasiswa terlebih dahulu."
      if (!lecturers.length) return "Belum ada dosen yang terdaftar di sistem. Silakan tambahkan user dosen terlebih dahulu."
    }
    if (tab === "kelas-praktikum") {
      if (!tahunSemester.length) return "Tambahkan tahun semester terlebih dahulu sebelum membuat kelas praktikum."
      if (!activeTahunSemester) return "Belum ada tahun semester yang aktif. Silakan aktifkan tahun semester terlebih dahulu pada tab Tahun Semester."
      if (!activeKurikulumList.length) return "Aktifkan minimal satu kurikulum terlebih dahulu sebelum membuat kelas praktikum."
      if (!mataKuliah.length) return "Belum ada mata kuliah yang terdaftar di sistem. Silakan tambahkan mata kuliah terlebih dahulu."
      if (!kelas.length) return "Tambahkan master kelas/rombel terlebih dahulu."
      if (!lecturers.length && !students.length) return "Belum ada dosen dan mahasiswa yang terdaftar di sistem. Silakan tambahkan user dosen dan mahasiswa terlebih dahulu."
      if (!lecturers.length) return "Belum ada dosen yang terdaftar di sistem. Silakan tambahkan user dosen terlebih dahulu."
      if (!students.length) return "Belum ada mahasiswa yang terdaftar di sistem. Silakan tambahkan user mahasiswa terlebih dahulu."
    }
    if (tab === "kenaikan-semester") {
      if (!tahunSemester.length) return "Tambahkan tahun semester terlebih dahulu sebelum mengatur kenaikan semester."
      if (!activeTahunSemester) return "Belum ada tahun semester yang aktif. Silakan aktifkan tahun semester terlebih dahulu pada tab Tahun Semester."
      if (!scopedKelasSemester.length) return "Belum ada Kelas Mahasiswa (Rombel) yang terdaftar pada tahun semester ini."
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
        next.id_kelas = ""
      }
      if (modal?.tab === "kelas-praktikum" && key === "id_kurikulum") {
        next.id_mata_kuliah = ""
        next.id_semester = ""
        next.id_kelas = ""
      }
      if (modal?.tab === "kelas" && key === "kelas") {
        next.kelas = value.toUpperCase()
      }
      if (modal?.tab === "tahun" && key === "tahun_awal") {
        if (/^\d{4}$/.test(value)) {
          next.tahun_akhir = String(Number(value) + 1)
        } else {
          next.tahun_akhir = ""
        }
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
        const isActivating = form.status === "active" && (modal.item as TahunSemester | undefined)?.status !== "active"
        if (isActivating) {
          setActivateTarget({ tab: "tahun", id, label: tahun_semester, pendingForm: { ...form } })
          setSubmitting(false)
          return
        }
        const targetStatus = normalizeAcademicStatus(form.status)
        if (id) {
          await academicDataApi.updateTahunSemester(id, { tahun_semester })
          if (targetStatus === "active") await academicDataApi.activateTahunSemester(id)
        } else {
          const created = await academicDataApi.createTahunSemester({ tahun_semester, status: "inactive" })
          if (targetStatus === "active" && created.id) await academicDataApi.activateTahunSemester(created.id)
        }
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
        const sksVal = Number(form.sks)
        if (!form.sks || isNaN(sksVal) || sksVal <= 0) {
          throw new Error("SKS harus berupa angka positif.")
        }
        await academicDataApi.saveMataKuliah({ ...form, sks: sksVal, tipe: (form.tipe as MataKuliahTipe) || "praktikum" }, id)
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
          closeModal()
          await loadData()
          toast.success(`Kelas ${displayClassName} berhasil dibuat.`)
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
            closeModal()
            await loadData()
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
            closeModal()
            await loadData()
            toast.success("Kelas berhasil diperbarui.")
            return
          }
        }
      } else if (modal.tab === "kelas-praktikum") {
        const mk = mataKuliah.find((item) => item.id === form.id_mata_kuliah)
        const targetSemesterId = mk?.id_semester ?? form.id_semester
        const targetTahunSemesterId = selectedOperationalTahunSemester?.id ?? form.id_tahun_semester
        const ksExists = kelasSemester.some(
          (ks) => ks.id_tahun_semester === targetTahunSemesterId && ks.id_semester === targetSemesterId && ks.id_kelas === form.id_kelas
        )
        if (!ksExists) {
          setError("Kelas praktikum hanya bisa dibuat untuk Kelas Mahasiswa (Rombel) yang sudah ada pada tahun semester ini. Silakan buat Kelas Mahasiswa terlebih dahulu.")
          setSubmitting(false)
          return
        }
        const kelasPraktikumPayload = {
          id_tahun_semester: selectedOperationalTahunSemester?.id ?? form.id_tahun_semester,
          id_kurikulum: form.id_kurikulum,
          id_mata_kuliah: form.id_mata_kuliah,
          id_semester: mk?.id_semester ?? form.id_semester,
          id_kelas: form.id_kelas,
          jumlah_jobsheet_rencana: Number(form.jumlah_jobsheet_rencana || 0),
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
      closeModal()
      await loadData()
      toast.success("Data berhasil disimpan.")
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
      await loadData()
      toast.success(tab === "kurikulum" ? "Kurikulum berhasil diaktifkan." : "Tahun semester berhasil diaktifkan di seluruh platform.")
    } catch (err) {
      console.error(`[Aktivasi Gagal] ${tab}:`, err)
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan data."
      toast.error(msg)
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
      let successMsg = "Data berhasil dihapus."
      if (tab === "tahun") await academicDataApi.deleteTahunSemester(id, true)
      else if (tab === "kurikulum") await academicDataApi.deleteKurikulum(id, true)
      else if (tab === "semester") await academicDataApi.deleteSemester(id, true)
      else if (tab === "kelas") await academicDataApi.deleteKelas(id, true)
      else if (tab === "mata-kuliah") await academicDataApi.deleteMataKuliah(id, true)
      else if (tab === "kelas-mahasiswa") {
        if (isKelasMahasiswaDetail) {
          await academicDataApi.deleteKelasMahasiswa(id)
          successMsg = "Mahasiswa berhasil dihapus dari kelas."
        } else {
          await academicDataApi.deleteKelasSemester(id)
          successMsg = "Kelas berhasil dihapus."
        }
      } else if (tab === "kelas-praktikum") {
        await academicDataApi.deleteKelasPraktikum(id)
        successMsg = "Kelas praktikum berhasil dihapus."
      }

      setDeleteTarget(null)
      await loadData()
      toast.success(successMsg)
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
        {tab === "kelas-praktikum" && (
          <AdminButton variant="ghost" className="h-8 px-2" onClick={() => openDetail(kelasPraktikumItem)}>
            <Eye size={14} />
            Detail
          </AdminButton>
        )}

        {(tab === "kurikulum" || tab === "tahun") && statusItem.status !== "active" && (
          <AdminButton
            variant="ghost"
            className="h-8 px-2 text-blue-600 hover:text-blue-700 font-semibold"
            disabled={submitting}
            onClick={() => {
              if (tab === "tahun") {
                setActivateTarget({ tab: "tahun", id: item.id, label: (item as TahunSemester).tahun_semester })
              } else {
                activate(tab, item.id)
              }
            }}
          >
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

  function renderTable() {
    if (loading) {
      return (
        <div className="space-y-3 p-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      )
    }

    if (activeTab === "tahun") {
      return (
        <TahunSemesterTab
          data={filtered as TahunSemester[]}
          page={page}
          limit={limit}
          submitting={submitting}
          statusBadgeIndo={statusBadgeIndo}
          onSetActivateTarget={setActivateTarget}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "kurikulum") {
      return (
        <KurikulumTab
          data={filtered as Kurikulum[]}
          page={page}
          limit={limit}
          submitting={submitting}
          statusBadgeIndo={statusBadgeIndo}
          onActivate={activate}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "semester") {
      return (
        <SemesterTab
          data={filtered as SemesterMaster[]}
          page={page}
          limit={limit}
          submitting={submitting}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "kelas") {
      return (
        <KelasTab
          data={filtered as KelasMaster[]}
          page={page}
          limit={limit}
          submitting={submitting}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "mata-kuliah") {
      return (
        <MataKuliahTab
          data={filtered as MataKuliah[]}
          page={page}
          limit={limit}
          submitting={submitting}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "kelas-mahasiswa") {
      return (
        <KelasMahasiswaTab
          groupedData={groupedKelasMahasiswa}
          page={page}
          limit={limit}
          submitting={submitting}
          statusBadgeIndo={statusBadgeIndo}
          onOpenDetail={(g) =>
            navigate(
              `/admin/academic/tahun-semester/${g.id_tahun_semester}/kelas-mahasiswa/${g.id_semester}/${g.id_kelas}`
            )
          }
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "kelas-praktikum") {
      return (
        <KelasPraktikumTab
          data={filtered as KelasPraktikum[]}
          pengampu={pengampu}
          page={page}
          limit={limit}
          submitting={submitting}
          onOpenDetail={openDetail}
          onOpenModal={openModal}
          onSetDeleteTarget={setDeleteTarget}
        />
      )
    }

    if (activeTab === "kenaikan-semester") {
      return (
        <KenaikanSemesterTab
          groupedData={groupedKelasMahasiswa}
          loading={loading}
          statusBadgeIndo={statusBadgeIndo}
          onOpenPromotionModal={(g) => {
            setPromotionSourceKsId(g.id)
            const targetSemNum = Number(g.semester_num) + 1
            const targetClass = kelasSemester.find((ks) => Number(ks.semester) === targetSemNum)
            setPromotionTargetKsId(targetClass?.id ?? "")
            setIsPromotionWizardOpen(true)
          }}
        />
      )
    }

    return null
  }

  function renderPromotionModals() {
    return (
      <KenaikanSemesterModal
        isOpen={isPromotionWizardOpen}
        groupedKelasMahasiswa={groupedKelasMahasiswa}
        scopedKelasMahasiswa={scopedKelasMahasiswa}
        kelasSemester={kelasSemester}
        semester={semester}
        kelas={kelas}
        tahunSemester={tahunSemester}
        initialSourceKsId={promotionSourceKsId}
        initialTargetKsId={promotionTargetKsId}
        onClose={() => setIsPromotionWizardOpen(false)}
        onSuccess={loadData}
      />
    )
  }

  const option = (id: string, label: string) => <option key={id} value={id}>{label}</option>
  const formTab = modal?.tab ?? activeTab
  const currentWarning = getPrerequisiteWarning(activeTab)
  const addDisabled = Boolean(currentWarning)

  function renderKelasPraktikumFields() {
    const hasKurikulum = Boolean(form.id_kurikulum)
    const selectedMK = mataKuliah.find((item) => item.id === form.id_mata_kuliah)
    const targetSemesterId = selectedMK?.id_semester
    const targetTahunSemesterId = detailTahunSemester?.id ?? form.id_tahun_semester ?? selectedOperationalTahunSemester?.id ?? activeTahunSemester?.id

    const assignedKelasIdsForMK = kelasPraktikum
      .filter((kp) =>
        kp.id_tahun_semester === targetTahunSemesterId &&
        kp.id_mata_kuliah === form.id_mata_kuliah &&
        kp.id !== (modal?.item as KelasPraktikum | undefined)?.id
      )
      .map((kp) => kp.id_kelas)

    const availableKelasForSelectedMK = targetSemesterId
      ? kelas.filter((k) =>
        scopedKelasSemester.some(
          (ks) => ks.id_semester === targetSemesterId && ks.id_kelas === k.id
        ) && !assignedKelasIdsForMK.includes(k.id)
      )
      : []

    return (
      <>
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
        <FieldRow label="Kelas (Rombel)">
          <AdminSelect
            value={form.id_kelas ?? ""}
            onChange={(v) => setField("id_kelas", v)}
            required
            disabled={!form.id_mata_kuliah || !availableKelasForSelectedMK.length}
          >
            <option value="">
              {!form.id_mata_kuliah
                ? "Pilih mata kuliah terlebih dahulu"
                : availableKelasForSelectedMK.length
                  ? "Pilih kelas rombel yang tersedia"
                  : "Semua kelas rombel untuk mata kuliah ini sudah dibuatkan kelas praktikum"}
            </option>
            {availableKelasForSelectedMK.map((i) => option(i.id, `Kelas ${i.kelas}`))}
          </AdminSelect>
        </FieldRow>
        {form.id_mata_kuliah && !availableKelasForSelectedMK.length && warningBox("Seluruh Kelas Mahasiswa (Rombel) pada semester ini sudah terdaftar sebagai kelas praktikum untuk mata kuliah ini.")}
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

    const isDuplicate = Boolean(
      form.tahun_awal &&
      form.tahun_akhir &&
      form.semester_type &&
      tahunSemester.some(
        (item) => item.id !== modal?.item?.id && item.tahun_semester.toLowerCase() === preview.toLowerCase()
      )
    )

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
              className={`${inputClass} sm:w-28 bg-gray-100 text-gray-500 cursor-not-allowed`}
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={form.tahun_akhir ?? ""}
              placeholder="2027"
              disabled
              readOnly
            />
            <AdminSelect value={form.semester_type ?? "Ganjil"} onChange={(v) => setField("semester_type", v)} required>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </AdminSelect>
          </div>
        </FieldRow>
        <FieldRow label="Status Tahun Semester">
          <AdminSelect value={form.status ?? "inactive"} onChange={(v) => setField("status", v)}>
            {statusOptions.map((item) => option(item.value, item.label))}
          </AdminSelect>
        </FieldRow>
        {isDuplicate && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
            ⚠️ Tahun semester <span className="font-bold">{preview}</span> sudah terdaftar di sistem. Silakan pilih tahun awal atau jenis semester yang berbeda.
          </div>
        )}
        <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Akan disimpan sebagai: <span className="font-semibold">{preview}</span>
        </div>
      </>
    )
  }

  function renderModals() {
    const isTahunDuplicate = Boolean(
      formTab === "tahun" &&
      form.tahun_awal &&
      form.tahun_akhir &&
      form.semester_type &&
      tahunSemester.some(
        (item) => item.id !== modal?.item?.id && item.tahun_semester.toLowerCase() === buildTahunSemester(form).toLowerCase()
      )
    )

    return (
      <>
        {modal && (
          <AdminModal
            title={
              formTab === "kelas-mahasiswa" && isKelasMahasiswaDetail
                ? "Tempatkan Mahasiswa"
                : `${modal.item ? "Edit" : "Tambah"} ${allTabs.find((item) => item.id === formTab)?.label.replace(/^\d+\.\s*/, "")}`
            }
            onClose={closeModal}
            footer={<><AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton><AdminButton disabled={submitting || isTahunDuplicate} type="submit" form="native-academic-form">{submitting ? "Menyimpan..." : "Simpan"}</AdminButton></>}
            size={formTab === "kelas-mahasiswa" && !isKelasMahasiswaDetail ? "sm" : "md"}
          >
            <form id="native-academic-form" className="space-y-4" onSubmit={submitForm}>
              {formTab === "tahun" && renderTahunSemesterFields()}
              {formTab === "kurikulum" && <><FieldRow label="Tahun Kurikulum"><input className={inputClass} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={form.tahun_kurikulum ?? ""} onChange={(e) => setField("tahun_kurikulum", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" required /></FieldRow><FieldRow label="Nama Kurikulum"><input className={inputClass} value={form.nama_kurikulum ?? ""} onChange={(e) => setField("nama_kurikulum", e.target.value)} placeholder="Kurikulum 2024" required /></FieldRow><FieldRow label="Status Kurikulum"><AdminSelect value={form.status ?? "inactive"} onChange={(v) => setField("status", v)}>{statusOptions.map((item) => option(item.value, item.label))}</AdminSelect></FieldRow></>}
              {formTab === "semester" && <FieldRow label="Semester"><input className={inputClass} type="number" min="1" value={form.semester ?? ""} onChange={(e) => setField("semester", e.target.value)} required /></FieldRow>}
              {formTab === "kelas" && <FieldRow label="Kelas/Rombel"><input className={inputClass} value={form.kelas ?? ""} onChange={(e) => setField("kelas", e.target.value)} placeholder="A" required /></FieldRow>}
              {formTab === "mata-kuliah" && (
                <>
                  <FieldRow label="Kurikulum">
                    {!activeKurikulum && warningBox("Aktifkan kurikulum terlebih dahulu sebelum menambahkan mata kuliah.")}
                    <AdminSelect value={form.id_kurikulum ?? ""} onChange={(v) => setField("id_kurikulum", v)} required>
                      <option value="">Pilih kurikulum</option>
                      {kurikulum.map((i) => option(i.id, `${i.nama_kurikulum} (${i.tahun_kurikulum})${formatActiveSuffix(i.status)}`))}
                    </AdminSelect>
                  </FieldRow>
                  <FieldRow label="Semester">
                    {!semester.length && warningBox("Tambahkan master semester terlebih dahulu sebelum menambahkan mata kuliah.")}
                    <AdminSelect value={form.id_semester ?? ""} onChange={(v) => setField("id_semester", v)} required>
                      <option value="">Pilih semester</option>
                      {semester.map((i) => option(i.id, `Semester ${i.semester}`))}
                    </AdminSelect>
                  </FieldRow>
                  <FieldRow label="Kode MK">
                    <input className={inputClass} value={form.kode_mk ?? ""} onChange={(e) => setField("kode_mk", e.target.value)} required />
                  </FieldRow>
                  <FieldRow label="Nama MK">
                    <input className={inputClass} value={form.nama_mk ?? ""} onChange={(e) => setField("nama_mk", e.target.value)} required />
                  </FieldRow>
                  <FieldRow label="SKS">
                    <input
                      className={inputClass}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.sks ?? ""}
                      onChange={(e) => setField("sks", e.target.value.replace(/\D/g, ""))}
                      placeholder="Input SKS"
                      required
                    />
                  </FieldRow>
                </>
              )}
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
                  <dt className="text-gray-500">Jumlah Jobsheet</dt><dd>{detail.jumlah_jobsheet_rencana ?? detail.jumlahJobsheetRencana ?? 0}</dd>
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

        {activateTarget && (
          <AdminConfirmModal
            title="Konfirmasi Aktivasi Tahun Semester"
            message={
              <div className="space-y-3 text-left">
                <p className="font-semibold text-gray-900">
                  Anda akan mengaktifkan periode akademik: <span className="text-blue-600">{activateTarget.label}</span>
                </p>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠️ Mengaktifkan tahun semester ini akan berdampak pada seluruh platform. Periode akademik aktif saat ini akan dinonaktifkan secara otomatis.
                </div>
                {submitting ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-600">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Sedang mengaktifkan tahun semester...
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Apakah Anda yakin ingin mengaktifkan tahun semester ini?
                  </p>
                )}
              </div>
            }
            confirmLabel={submitting ? "Mengaktifkan..." : "Ya, Aktifkan"}
            variant="primary"
            loading={submitting}
            onCancel={() => {
              if (!submitting) setActivateTarget(null)
            }}
            onConfirm={async () => {
              setSubmitting(true)
              setError("")
              try {
                if (activateTarget.pendingForm) {
                  const formToSubmit = activateTarget.pendingForm
                  const id = activateTarget.id
                  const tahun_semester = validateTahunSemesterForm(formToSubmit, tahunSemester, id)
                  if (id) {
                    await academicDataApi.updateTahunSemester(id, { tahun_semester })
                    await academicDataApi.activateTahunSemester(id)
                  } else {
                    const created = await academicDataApi.createTahunSemester({ tahun_semester, status: "inactive" })
                    if (created.id) await academicDataApi.activateTahunSemester(created.id)
                  }
                  closeModal()
                } else if (activateTarget.id) {
                  await academicDataApi.activateTahunSemester(activateTarget.id)
                }
                setActivateTarget(null)
                await loadData()
                toast.success("Tahun semester berhasil diaktifkan di seluruh platform.")
              } catch (err) {
                console.error("[Aktivasi Gagal] Tahun Semester:", err)
                const msg = err instanceof Error ? err.message : "Gagal mengaktifkan tahun semester."
                toast.error(msg)
              } finally {
                setSubmitting(false)
              }
            }}
          />
        )}
      </>
    )
  }

  function renderInlinePromotionModals() {
    const closeWizard = () => {
      if (submittingPromotion) return
      setIsPromotionWizardOpen(false)
      setPromotionSubmitError("")
      setCheckedSourceStudentIds([])
      setPromotedStudentsMap({})
    }

    const sourceGroup = groupedKelasMahasiswa.find((g) => g.id === promotionSourceKsId) ?? null
    const sourceSemesterNum = sourceGroup ? Number(sourceGroup.semester_num) : 0

    const sourceStudents = sourceGroup
      ? scopedKelasMahasiswa.filter(
        (km) => km.id_semester === sourceGroup.id_semester && km.id_kelas === sourceGroup.id_kelas
      )
      : []

    const availableSourceStudents = sourceStudents.filter((s) => !promotedStudentsMap[s.id_mahasiswa])

    const targetSemesterNum = sourceSemesterNum + 1
    const validTargetClasses = kelasSemester.filter((ks) => Number(ks.semester) === targetSemesterNum)

    const isAllSourceChecked =
      availableSourceStudents.length > 0 &&
      availableSourceStudents.every((s) => checkedSourceStudentIds.includes(s.id_mahasiswa))

    return (
      <>
        {isPromotionWizardOpen && (
          <AdminModal
            title="Proses Kenaikan Semester Mahasiswa"
            size="lg"
            onClose={closeWizard}
            footer={
              <>
                <AdminButton variant="secondary" onClick={closeWizard} disabled={submittingPromotion}>
                  Batal
                </AdminButton>
                <AdminButton
                  onClick={async () => {
                    const transitions = Object.entries(promotedStudentsMap).map(([studentId, item]) => ({
                      studentId,
                      targetKelasSemesterId: item.targetKsId,
                    }))
                    if (!transitions.length || !promotionSourceKsId) {
                      toast.error("Belum ada mahasiswa yang dipindahkan ke Kolom Tujuan.")
                      return
                    }

                    setSubmittingPromotion(true)
                    setPromotionSubmitError("")
                    try {
                      await academicDataApi.transitionStudents({
                        sourceKelasSemesterId: promotionSourceKsId,
                        transitions,
                      })
                      setIsPromotionWizardOpen(false)
                      setPromotedStudentsMap({})
                      setCheckedSourceStudentIds([])
                      await loadData()
                      toast.success(`${transitions.length} mahasiswa berhasil dinaikkan semester!`)
                    } catch (err) {
                      console.error("[Kenaikan Semester Gagal]:", err)
                      const msg = err instanceof Error ? err.message : "Gagal memproses kenaikan semester."
                      setPromotionSubmitError(msg)
                      toast.error(msg)
                    } finally {
                      setSubmittingPromotion(false)
                    }
                  }}
                  disabled={submittingPromotion || Object.keys(promotedStudentsMap).length === 0}
                >
                  {submittingPromotion && <Loader2 size={16} className="animate-spin" />}
                  {submittingPromotion ? "Memproses Kenaikan..." : "Simpan & Finalisasi Kenaikan Semester"}
                </AdminButton>
              </>
            }
          >
            <div className="space-y-4">
              {promotionSubmitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {promotionSubmitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* KOLOM 1: KELAS ASAL & DAFTAR MAHASISWA */}
                <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">1. Kelas Asal</h3>
                      <p className="text-xs text-gray-500">Pilih kelas & mahasiswa yang akan dinaikkan</p>
                    </div>
                    {sourceGroup && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Semester {sourceGroup.semester_num}
                      </span>
                    )}
                  </div>

                  {/* Dropdown Kelas Asal */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Kelas / Rombel Asal</label>
                    <AdminSelect
                      value={promotionSourceKsId}
                      onChange={(v) => {
                        setPromotionSourceKsId(v)
                        setCheckedSourceStudentIds([])
                        setPromotedStudentsMap({})

                        const targetGroup = groupedKelasMahasiswa.find((g) => g.id === v)
                        const tSemNum = targetGroup ? Number(targetGroup.semester_num) + 1 : 0
                        const tClass = kelasSemester.find((ks) => Number(ks.semester) === tSemNum)
                        setPromotionTargetKsId(tClass?.id ?? "")
                      }}
                    >
                      <option value="">-- Pilih Kelas Asal --</option>
                      {groupedKelasMahasiswa.map((g) => (
                        <option key={g.id} value={g.id}>
                          {formatKelasMahasiswaName({ semester_num: g.semester_num, kelas_name: g.kelas_name })} (Semester {g.semester_num})
                        </option>
                      ))}
                    </AdminSelect>
                  </div>

                  {/* Toolbar & Select All */}
                  {sourceGroup && availableSourceStudents.length > 0 && (
                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-md border border-gray-200 text-xs">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={isAllSourceChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedSourceStudentIds(availableSourceStudents.map((s) => s.id_mahasiswa))
                            } else {
                              setCheckedSourceStudentIds([])
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Pilih Semua ({availableSourceStudents.length})</span>
                      </label>
                      <span className="text-blue-600 font-semibold">{checkedSourceStudentIds.length} dipilih</span>
                    </div>
                  )}

                  {/* Student List Box (Column 1) */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 bg-white">
                    {!promotionSourceKsId ? (
                      <p className="p-6 text-center text-xs text-gray-500">Pilih kelas asal terlebih dahulu.</p>
                    ) : !availableSourceStudents.length ? (
                      <p className="p-6 text-center text-xs text-gray-500">
                        {sourceStudents.length === 0
                          ? "Belum ada mahasiswa di kelas ini."
                          : "Seluruh mahasiswa telah dipindahkan ke Kolom Tujuan."}
                      </p>
                    ) : (
                      availableSourceStudents.map((student) => {
                        const isChecked = checkedSourceStudentIds.includes(student.id_mahasiswa)
                        return (
                          <label
                            key={student.id_mahasiswa}
                            className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors hover:bg-blue-50/50 ${isChecked ? "bg-blue-50/70 font-medium" : ""}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCheckedSourceStudentIds((prev) => [...prev, student.id_mahasiswa])
                                  } else {
                                    setCheckedSourceStudentIds((prev) => prev.filter((id) => id !== student.id_mahasiswa))
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-semibold text-gray-900">{student.fullname ?? student.id_mahasiswa}</p>
                                <p className="text-[11px] text-gray-500 font-mono">NIM: {student.nim ?? "-"}</p>
                              </div>
                            </div>
                            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 border border-green-200">
                              Aktif
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* TOMBOL AKSI TENGAH: NAIKKAN TO COLUMN 2 */}
                <div className="flex flex-col items-center justify-center gap-2 self-center py-4 md:py-16">
                  <AdminButton
                    variant="primary"
                    className="w-full md:w-auto px-3.5 py-2 flex items-center justify-center gap-1.5 shadow-sm text-xs font-semibold"
                    disabled={checkedSourceStudentIds.length === 0 || !promotionTargetKsId}
                    onClick={() => {
                      if (!promotionTargetKsId || !checkedSourceStudentIds.length) return
                      const targetKs = kelasSemester.find((ks) => ks.id === promotionTargetKsId)
                      const targetSemObj = semester.find((s) => s.id === targetKs?.id_semester)
                      const targetKlsObj = kelas.find((k) => k.id === targetKs?.id_kelas)
                      const targetLabel = `Semester ${targetSemObj?.semester ?? ""} Kelas ${targetKlsObj?.kelas ?? ""}`

                      const newPromoted = { ...promotedStudentsMap }
                      checkedSourceStudentIds.forEach((studentId) => {
                        const student = sourceStudents.find((s) => s.id_mahasiswa === studentId)
                        if (student) {
                          newPromoted[studentId] = {
                            student,
                            targetKsId: promotionTargetKsId,
                            targetLabel,
                          }
                        }
                      })
                      setPromotedStudentsMap(newPromoted)
                      setCheckedSourceStudentIds([])
                    }}
                  >
                    <span>Naikkan ({checkedSourceStudentIds.length})</span>
                    <ArrowRight size={14} />
                  </AdminButton>
                </div>

                {/* KOLOM 2: KELAS TUJUAN & MAHASISWA NAIK SEMESTER */}
                <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">2. Kelas Tujuan</h3>
                      <p className="text-xs text-gray-500">Mahasiswa yang akan dinaikkan semester</p>
                    </div>
                    {sourceGroup && (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                        Wajib Semester {targetSemesterNum}
                      </span>
                    )}
                  </div>

                  {/* Dropdown Kelas Tujuan (RULE: Strict targetSemesterNum) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pilih Kelas Tujuan (Hanya Semester {sourceGroup ? targetSemesterNum : "?"})
                    </label>
                    <AdminSelect
                      value={promotionTargetKsId}
                      onChange={setPromotionTargetKsId}
                      disabled={!sourceGroup || !validTargetClasses.length}
                    >
                      <option value="">
                        {!sourceGroup
                          ? "-- Pilih Kelas Asal Terlebih Dahulu --"
                          : validTargetClasses.length
                            ? `-- Pilih Kelas Tujuan (Semester ${targetSemesterNum}) --`
                            : `Belum ada kelas untuk Semester ${targetSemesterNum}`}
                      </option>
                      {validTargetClasses.map((ks) => {
                        const semObj = semester.find((s) => s.id === ks.id_semester)
                        const klsObj = kelas.find((k) => k.id === ks.id_kelas)
                        return (
                          <option key={ks.id} value={ks.id}>
                            Semester {semObj?.semester} Kelas {klsObj?.kelas}
                          </option>
                        )
                      })}
                    </AdminSelect>
                    {sourceGroup && !validTargetClasses.length && (
                      <p className="mt-1 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        ⚠️ Belum ada Kelas Mahasiswa (Rombel) untuk Semester {targetSemesterNum}. Silakan buat terlebih dahulu pada tab Kelas Mahasiswa.
                      </p>
                    )}
                  </div>

                  {/* Counter & Kosongkan Kolom 2 */}
                  {Object.keys(promotedStudentsMap).length > 0 && (
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-md border border-emerald-200 text-xs">
                      <span className="text-emerald-700 font-semibold">{Object.keys(promotedStudentsMap).length} mahasiswa siap dinaikkan</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 font-medium underline text-[11px]"
                        onClick={() => setPromotedStudentsMap({})}
                      >
                        Kosongkan Kolom
                      </button>
                    </div>
                  )}

                  {/* Student List Box (Column 2) */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 bg-white">
                    {!Object.keys(promotedStudentsMap).length ? (
                      <p className="p-6 text-center text-xs text-gray-500">
                        Belum ada mahasiswa dipindahkan ke kolom ini. Pilih mahasiswa di Kolom 1 lalu klik &quot;Naikkan →&quot;.
                      </p>
                    ) : (
                      Object.entries(promotedStudentsMap).map(([studentId, item]) => (
                        <div key={studentId} className="flex items-center justify-between p-2.5 text-xs hover:bg-gray-50">
                          <div>
                            <p className="font-semibold text-gray-900">{item.student.fullname ?? item.student.id_mahasiswa}</p>
                            <p className="text-[11px] text-gray-500 font-mono">NIM: {item.student.nim ?? "-"}</p>
                            <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                              {item.targetLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Batalkan mahasiswa ini"
                            onClick={() => {
                              const newPromoted = { ...promotedStudentsMap }
                              delete newPromoted[studentId]
                              setPromotedStudentsMap(newPromoted)
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AdminModal>
        )}
      </>
    )
  }

  void renderInlinePromotionModals

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

    const activeTsBadge = detailTahunSemester
      ? (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          {detailTahunSemester.tahun_semester}
        </div>
      )
      : undefined

    const breadcrumbItems = [
      { label: "Data Akademik", to: "/admin/academic/kelas-mahasiswa" },
      { label: "Kelas Mahasiswa", to: "/admin/academic/kelas-mahasiswa" },
      { label: displayClassName || "Kelas Mahasiswa" },
    ]

    return (
      <AdminLayout
        breadcrumbItems={breadcrumbItems}
        backTo="/admin/academic/kelas-mahasiswa"
        rightContent={activeTsBadge}
      >
        <div className="space-y-6">
          <div>
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
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    if (!currentKelasSemester) return
                    setPromotionSourceKsId(currentKelasSemester.id)
                    setCheckedSourceStudentIds([])
                    setPromotedStudentsMap({})
                    const targetSemNum = Number(currentKelasSemester.semester) + 1
                    const targetClass = kelasSemester.find((ks) => Number(ks.semester) === targetSemNum)
                    setPromotionTargetKsId(targetClass?.id ?? "")
                    setIsPromotionWizardOpen(true)
                  }}
                  disabled={!activePromotionStudents.length || !currentKelasSemester}
                >
                  Kenaikan Semester
                </AdminButton>
                <AdminButton onClick={() => openModal("kelas-mahasiswa")} disabled={Boolean(getPrerequisiteWarning("kelas-mahasiswa"))}>
                  <Plus size={16} />
                  Tempatkan Mahasiswa
                </AdminButton>
              </div>
            </div>
            <div className="p-4">
              {filteredClassStudents.length ? (
                <AdminTable
                  variant="medium"
                  headers={[
                    { text: "NIM", align: "left" },
                    { text: "Nama Mahasiswa", align: "left" },
                    { text: "Aksi", align: "right" },
                  ]}
                >
                  {filteredClassStudents.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 text-left">{item.nim ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold text-left text-gray-900">{item.fullname ?? item.id_mahasiswa}</td>
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
          <TopProgressBar />
          <div className="space-y-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-8 w-64 bg-gray-200 rounded-xl" />
              <div className="h-4 w-48 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-10 w-full max-w-md bg-gray-200 rounded-xl" />
            <div className="space-y-3 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </div>
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

    const breadcrumbItems = [
      { label: "Data Akademik", to: "/admin/academic/tahun-semester" },
      { label: "Tahun Semester", to: "/admin/academic/tahun-semester" },
      { label: detailTahunSemester.tahun_semester },
    ]

    return (
      <AdminLayout breadcrumbItems={breadcrumbItems}>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
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
                <KelasMahasiswaTab
                  groupedData={groupedKelasMahasiswa}
                  page={1}
                  limit={100}
                  submitting={submitting}
                  statusBadgeIndo={statusBadgeIndo}
                  onOpenDetail={(g) =>
                    navigate(
                      `/admin/academic/tahun-semester/${g.id_tahun_semester}/kelas-mahasiswa/${g.id_semester}/${g.id_kelas}`
                    )
                  }
                  onOpenModal={openModal}
                  onSetDeleteTarget={setDeleteTarget}
                />
              </div>
            </AdminPanel>
          )}

          {localTab === "praktikum" && (
            <div className="space-y-4">
              {getPrerequisiteWarning("kelas-praktikum") && warningBox(getPrerequisiteWarning("kelas-praktikum"))}
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
                <div className="p-4">
                  <KelasPraktikumTab
                    data={filteredKelasPraktikum}
                    pengampu={pengampu}
                    page={1}
                    limit={100}
                    submitting={submitting}
                    isDetailView={true}
                    onOpenDetail={openDetail}
                    onOpenModal={openModal}
                    onSetDeleteTarget={setDeleteTarget}
                  />
                </div>
              </AdminPanel>
            </div>
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

  const mainBreadcrumbItems = [
    { label: "Data Akademik", to: "/admin/academic/tahun-semester" },
    { label: activeTabMeta.title },
  ]

  const showOperationalContext = activeTab === "kelas-mahasiswa" || activeTab === "kelas-praktikum" || activeTab === "kenaikan-semester"
  const activeTsBadge = showOperationalContext && activeTahunSemester
    ? (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        {activeTahunSemester.tahun_semester}
      </div>
    )
    : undefined

  return (
    <AdminLayout breadcrumbItems={mainBreadcrumbItems} rightContent={activeTsBadge}>
      <AdminSectionHeader
        eyebrow="Data Akademik"
        title={activeTabMeta.title}
        description={activeTabMeta.description}
        actions={
          <>
            <AdminSearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder={searchPlaceholder[activeTab]}
            />
            {activeTab !== "kenaikan-semester" && (
              <AdminButton
                disabled={addDisabled}
                title={currentWarning || "Tambah data"}
                onClick={() => {
                  openModal(activeTab)
                }}
              >
                <Plus size={16} />
                {activeTabMeta.addLabel}
              </AdminButton>
            )}
          </>
        }
      />
      <div className="space-y-6">
        {currentWarning && warningBox(currentWarning)}

        {(() => {
          const activeTabVariant: "compact" | "medium" | "full" =
            activeTab === "semester" || activeTab === "kelas"
              ? "compact"
              : activeTab === "tahun" || activeTab === "kurikulum"
                ? "medium"
                : "full"

          return (
            <AdminPanel variant={activeTabVariant}>
              <div className="p-4">
                {renderTable()}
                {(() => {
                  const totalItems = (activeTab === "kelas-mahasiswa" || activeTab === "kenaikan-semester") ? groupedKelasMahasiswa.length : filtered.length
                  return renderPagination(page, Math.ceil(totalItems / limit), setPage, totalItems)
                })()}
              </div>
            </AdminPanel>
          )
        })()}
      </div>

      {renderModals()}
      {renderPromotionModals()}

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
                <dt className="text-gray-500">Jumlah Jobsheet</dt><dd>{detail.jumlah_jobsheet_rencana ?? detail.jumlahJobsheetRencana ?? 0}</dd>
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
      {activateTarget && (
        <AdminConfirmModal
          title="Konfirmasi Aktivasi Tahun Semester"
          message={
            <div className="space-y-3 text-left">
              <p className="font-semibold text-gray-900">
                Anda akan mengaktifkan periode akademik: <span className="text-blue-600">{activateTarget.label}</span>
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ Mengaktifkan tahun semester ini akan berdampak pada seluruh platform. Periode akademik aktif saat ini akan dinonaktifkan secara otomatis.
              </div>
              {submitting ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-600">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  Sedang mengaktifkan tahun semester...
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Apakah Anda yakin ingin mengaktifkan tahun semester ini?
                </p>
              )}
            </div>
          }
          confirmLabel={submitting ? "Mengaktifkan..." : "Ya, Aktifkan"}
          variant="primary"
          loading={submitting}
          onCancel={() => {
            if (!submitting) setActivateTarget(null)
          }}
          onConfirm={async () => {
            setSubmitting(true)
            setError("")
            try {
              if (activateTarget.pendingForm) {
                const formToSubmit = activateTarget.pendingForm
                const id = activateTarget.id
                const tahun_semester = validateTahunSemesterForm(formToSubmit, tahunSemester, id)
                if (id) {
                  await academicDataApi.updateTahunSemester(id, { tahun_semester })
                  await academicDataApi.activateTahunSemester(id)
                } else {
                  const created = await academicDataApi.createTahunSemester({ tahun_semester, status: "inactive" })
                  if (created.id) await academicDataApi.activateTahunSemester(created.id)
                }
                closeModal()
              } else if (activateTarget.id) {
                await academicDataApi.activateTahunSemester(activateTarget.id)
              }
              setActivateTarget(null)
              await loadData()
              toast.success("Tahun semester berhasil diaktifkan di seluruh platform.")
            } catch (err) {
              console.error("[Aktivasi Gagal] Tahun Semester:", err)
              const msg = err instanceof Error ? err.message : "Gagal mengaktifkan tahun semester."
              toast.error(msg)
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </AdminLayout>
  )
}
