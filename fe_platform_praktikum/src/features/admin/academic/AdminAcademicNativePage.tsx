import { Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "../components/AdminLayout"
import {
  AdminActionCell,
  AdminButton,
  AdminConfirmModal,
  AdminModal,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminTable,
  AdminTabs,
  EmptyState,
  FieldRow,
  inputClass,
} from "../components/AdminUI"
import { getAdminUsers } from "../../../services/admin/service"
import type { AdminLecturer, AdminStudent } from "../../../services/admin/types"
import {
  academicDataApi,
  type KelasMahasiswa,
  type KelasMaster,
  type KelasPraktikum,
  type Kurikulum,
  type MataKuliah,
  type Pengampu,
  type SemesterMaster,
  type TahunSemester,
} from "../../../services/admin/academicData/service"

type NativeTab =
  | "tahun"
  | "kurikulum"
  | "semester"
  | "kelas"
  | "mata-kuliah"
  | "kelas-mahasiswa"
  | "kelas-praktikum"
  | "pengampu"

type FormState = Record<string, string>
type EditingState = { tab: NativeTab; item: any } | null
type DeleteTarget = { tab: NativeTab; id: string; label: string } | null

const tabs: Array<{ id: NativeTab; label: string }> = [
  { id: "tahun", label: "Tahun Semester" },
  { id: "kurikulum", label: "Kurikulum" },
  { id: "semester", label: "Semester" },
  { id: "kelas", label: "Kelas" },
  { id: "mata-kuliah", label: "Mata Kuliah" },
  { id: "kelas-mahasiswa", label: "Kelas Mahasiswa" },
  { id: "kelas-praktikum", label: "Kelas Praktikum" },
  { id: "pengampu", label: "Pengampu" },
]

const statusOptions = ["active", "inactive", "archived"]
const kelasPraktikumStatusOptions = ["draft", "open", "closed", "archived"]
const tipeOptions = ["teori", "praktikum", "teori_praktikum"]
const peranOptions = ["utama", "asisten", "pengganti"]

function normalizeForm(tab: NativeTab, item?: any): FormState {
  if (tab === "tahun") return { tahun_semester: item?.tahun_semester ?? "", status: item?.status ?? "inactive" }
  if (tab === "kurikulum") return { tahun_kurikulum: item?.tahun_kurikulum ?? "", nama_kurikulum: item?.nama_kurikulum ?? "", status: item?.status ?? "inactive" }
  if (tab === "semester") return { semester: String(item?.semester ?? "") }
  if (tab === "kelas") return { kelas: item?.kelas ?? "" }
  if (tab === "mata-kuliah") {
    return {
      kode_mk: item?.kode_mk ?? "",
      nama_mk: item?.nama_mk ?? "",
      sks: String(item?.sks ?? ""),
      tipe: item?.tipe ?? "praktikum",
      id_kurikulum: item?.id_kurikulum ?? "",
      id_semester: item?.id_semester ?? "",
    }
  }
  if (tab === "kelas-mahasiswa") {
    return {
      id_tahun_semester: item?.id_tahun_semester ?? "",
      id_semester: item?.id_semester ?? "",
      id_kelas: item?.id_kelas ?? "",
      id_mahasiswa: item?.id_mahasiswa ?? "",
      status: item?.status ?? "active",
    }
  }
  if (tab === "kelas-praktikum") {
    return {
      id_tahun_semester: item?.id_tahun_semester ?? "",
      id_mata_kuliah: item?.id_mata_kuliah ?? "",
      id_semester: item?.id_semester ?? "",
      id_kelas: item?.id_kelas ?? "",
      nama_kelas: item?.nama_kelas ?? "",
      status: item?.status ?? "draft",
    }
  }
  return {
    id_kelas_praktikum: item?.id_kelas_praktikum ?? "",
    id_dosen: item?.id_dosen ?? "",
    peran: item?.peran ?? "utama",
  }
}

function includesKeyword(values: Array<string | number | undefined>, keyword: string) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized))
}

export default function AdminAcademicNativePage() {
  const [activeTab, setActiveTab] = useState<NativeTab>("tahun")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modal, setModal] = useState<EditingState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [form, setForm] = useState<FormState>(normalizeForm("tahun"))

  const [tahunSemester, setTahunSemester] = useState<TahunSemester[]>([])
  const [kurikulum, setKurikulum] = useState<Kurikulum[]>([])
  const [semester, setSemester] = useState<SemesterMaster[]>([])
  const [kelas, setKelas] = useState<KelasMaster[]>([])
  const [mataKuliah, setMataKuliah] = useState<MataKuliah[]>([])
  const [kelasMahasiswa, setKelasMahasiswa] = useState<KelasMahasiswa[]>([])
  const [kelasPraktikum, setKelasPraktikum] = useState<KelasPraktikum[]>([])
  const [pengampu, setPengampu] = useState<Pengampu[]>([])
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([])

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
      setKelasPraktikum(kelasPraktikumData)
      setPengampu(pengampuData)
      setStudents(studentData as AdminStudent[])
      setLecturers(lecturerData as AdminLecturer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data akademik baru.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    if (activeTab === "tahun") return tahunSemester.filter((i) => includesKeyword([i.tahun_semester, i.status], keyword))
    if (activeTab === "kurikulum") return kurikulum.filter((i) => includesKeyword([i.tahun_kurikulum, i.nama_kurikulum, i.status], keyword))
    if (activeTab === "semester") return semester.filter((i) => includesKeyword([i.semester], keyword))
    if (activeTab === "kelas") return kelas.filter((i) => includesKeyword([i.kelas], keyword))
    if (activeTab === "mata-kuliah") return mataKuliah.filter((i) => includesKeyword([i.kode_mk, i.nama_mk, i.nama_kurikulum, i.semester, i.tipe], keyword))
    if (activeTab === "kelas-mahasiswa") return kelasMahasiswa.filter((i) => includesKeyword([i.tahun_semester, i.semester, i.kelas, i.nim, i.fullname, i.status], keyword))
    if (activeTab === "kelas-praktikum") return kelasPraktikum.filter((i) => includesKeyword([i.nama_kelas, i.nama_mk, i.tahun_semester, i.kelas, i.status], keyword))
    return pengampu.filter((i) => includesKeyword([i.nama_kelas, i.nama_mk, i.fullname, i.nip, i.peran], keyword))
  }, [activeTab, kelas, kelasMahasiswa, kelasPraktikum, keyword, kurikulum, mataKuliah, pengampu, semester, tahunSemester])

  const openModal = (tab: NativeTab, item?: any) => {
    setError("")
    setSuccess("")
    setModal({ tab, item })
    setForm(normalizeForm(tab, item))
  }

  const closeModal = () => {
    setModal(null)
    setForm(normalizeForm(activeTab))
  }

  const setField = (key: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (modal?.tab === "kelas-praktikum" && ["id_mata_kuliah", "id_tahun_semester", "id_semester", "id_kelas"].includes(key)) {
        const mk = mataKuliah.find((item) => item.id === next.id_mata_kuliah)
        const ts = tahunSemester.find((item) => item.id === next.id_tahun_semester)
        const smt = semester.find((item) => item.id === (next.id_semester || mk?.id_semester))
        const kls = kelas.find((item) => item.id === next.id_kelas)
        next.id_semester = next.id_semester || mk?.id_semester || ""
        next.nama_kelas = [mk?.nama_mk, smt?.semester ? `Semester ${smt.semester}` : "", kls?.kelas ? `Kelas ${kls.kelas}` : "", ts?.tahun_semester].filter(Boolean).join(" - ")
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
        id ? await academicDataApi.updateTahunSemester(id, form) : await academicDataApi.createTahunSemester(form)
      } else if (modal.tab === "kurikulum") {
        id ? await academicDataApi.updateKurikulum(id, form) : await academicDataApi.createKurikulum(form)
      } else if (modal.tab === "semester") {
        await academicDataApi.saveSemester({ semester: Number(form.semester) }, id)
      } else if (modal.tab === "kelas") {
        await academicDataApi.saveKelas({ kelas: form.kelas }, id)
      } else if (modal.tab === "mata-kuliah") {
        await academicDataApi.saveMataKuliah({ ...form, sks: Number(form.sks) }, id)
      } else if (modal.tab === "kelas-mahasiswa") {
        await academicDataApi.saveKelasMahasiswa(form, id)
      } else if (modal.tab === "kelas-praktikum") {
        await academicDataApi.saveKelasPraktikum(form, id)
      } else {
        await academicDataApi.savePengampu(form, id)
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
      if (deleteTarget.tab === "tahun") await academicDataApi.deleteTahunSemester(deleteTarget.id)
      if (deleteTarget.tab === "kurikulum") await academicDataApi.deleteKurikulum(deleteTarget.id)
      if (deleteTarget.tab === "semester") await academicDataApi.deleteSemester(deleteTarget.id)
      if (deleteTarget.tab === "kelas") await academicDataApi.deleteKelas(deleteTarget.id)
      if (deleteTarget.tab === "mata-kuliah") await academicDataApi.deleteMataKuliah(deleteTarget.id)
      if (deleteTarget.tab === "kelas-mahasiswa") await academicDataApi.deleteKelasMahasiswa(deleteTarget.id)
      if (deleteTarget.tab === "kelas-praktikum") await academicDataApi.deleteKelasPraktikum(deleteTarget.id)
      if (deleteTarget.tab === "pengampu") await academicDataApi.deletePengampu(deleteTarget.id)
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data.")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatus = (value?: string) => (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${value === "active" || value === "open" ? "bg-green-100 text-green-700" : value === "archived" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
      {value}
    </span>
  )

  const actionCell = (tab: NativeTab, item: any, label: string) => (
    <AdminActionCell>
      {(tab === "tahun" || tab === "kurikulum") && item.status !== "active" && (
        <AdminButton variant="ghost" className="h-8 px-2" disabled={submitting} onClick={() => activate(tab, item.id)}>
          Aktifkan
        </AdminButton>
      )}
      <AdminButton variant="ghost" className="h-8 px-2" onClick={() => openModal(tab, item)}>
        Edit
      </AdminButton>
      <AdminButton variant="danger" className="h-8 px-2" disabled={submitting} onClick={() => setDeleteTarget({ tab, id: item.id, label })}>
        Hapus
      </AdminButton>
    </AdminActionCell>
  )

  function renderTable() {
    if (!filtered.length) return <EmptyState title="Belum ada data" action={<AdminButton onClick={() => openModal(activeTab)}><Plus size={16} />Tambah</AdminButton>} />
    if (activeTab === "tahun") {
      return <AdminTable headers={["Tahun Semester", "Status", "Aksi"]}>{(filtered as TahunSemester[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.tahun_semester}</td><td className="px-4 py-3">{renderStatus(i.status)}</td><td className="px-4 py-3">{actionCell("tahun", i, i.tahun_semester)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "kurikulum") {
      return <AdminTable headers={["Tahun", "Nama", "Status", "Aksi"]}>{(filtered as Kurikulum[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.tahun_kurikulum}</td><td className="px-4 py-3">{i.nama_kurikulum}</td><td className="px-4 py-3">{renderStatus(i.status)}</td><td className="px-4 py-3">{actionCell("kurikulum", i, i.nama_kurikulum)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "semester") {
      return <AdminTable headers={["Semester", "Aksi"]}>{(filtered as SemesterMaster[]).map((i) => <tr key={i.id}><td className="px-4 py-3">Semester {i.semester}</td><td className="px-4 py-3">{actionCell("semester", i, `Semester ${i.semester}`)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "kelas") {
      return <AdminTable headers={["Kelas", "Aksi"]}>{(filtered as KelasMaster[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.kelas}</td><td className="px-4 py-3">{actionCell("kelas", i, i.kelas)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "mata-kuliah") {
      return <AdminTable headers={["Kode", "Mata Kuliah", "SKS", "Tipe", "Kurikulum", "Semester", "Aksi"]}>{(filtered as MataKuliah[]).map((i) => <tr key={i.id}><td className="px-4 py-3 font-mono">{i.kode_mk}</td><td className="px-4 py-3">{i.nama_mk}</td><td className="px-4 py-3">{i.sks}</td><td className="px-4 py-3">{i.tipe}</td><td className="px-4 py-3">{i.nama_kurikulum}</td><td className="px-4 py-3">{i.semester}</td><td className="px-4 py-3">{actionCell("mata-kuliah", i, i.nama_mk)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "kelas-mahasiswa") {
      return <AdminTable headers={["Mahasiswa", "Tahun Semester", "Semester", "Kelas", "Status", "Aksi"]}>{(filtered as KelasMahasiswa[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.fullname ?? i.id_mahasiswa}<div className="text-xs text-gray-500">{i.nim}</div></td><td className="px-4 py-3">{i.tahun_semester}</td><td className="px-4 py-3">{i.semester}</td><td className="px-4 py-3">{i.kelas}</td><td className="px-4 py-3">{renderStatus(i.status)}</td><td className="px-4 py-3">{actionCell("kelas-mahasiswa", i, i.fullname ?? i.id_mahasiswa)}</td></tr>)}</AdminTable>
    }
    if (activeTab === "kelas-praktikum") {
      return <AdminTable headers={["Nama Kelas", "Tahun Semester", "Mata Kuliah", "Semester", "Kelas", "Status", "Aksi"]}>{(filtered as KelasPraktikum[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.nama_kelas}</td><td className="px-4 py-3">{i.tahun_semester}</td><td className="px-4 py-3">{i.nama_mk}</td><td className="px-4 py-3">{i.semester}</td><td className="px-4 py-3">{i.kelas}</td><td className="px-4 py-3">{renderStatus(i.status)}</td><td className="px-4 py-3">{actionCell("kelas-praktikum", i, i.nama_kelas)}</td></tr>)}</AdminTable>
    }
    return <AdminTable headers={["Kelas Praktikum", "Dosen", "Peran", "Aksi"]}>{(filtered as Pengampu[]).map((i) => <tr key={i.id}><td className="px-4 py-3">{i.nama_kelas ?? i.id_kelas_praktikum}<div className="text-xs text-gray-500">{i.nama_mk}</div></td><td className="px-4 py-3">{i.fullname ?? i.id_dosen}<div className="text-xs text-gray-500">{i.nip}</div></td><td className="px-4 py-3">{i.peran}</td><td className="px-4 py-3">{actionCell("pengampu", i, `${i.fullname} - ${i.nama_kelas}`)}</td></tr>)}</AdminTable>
  }

  const option = (id: string, label: string) => <option key={id} value={id}>{label}</option>
  const formTab = modal?.tab ?? activeTab

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Data Akademik</h1>
            <p className="text-sm text-gray-500">Fondasi baru: tahun semester, kurikulum, rombel, mata kuliah, kelas mahasiswa, kelas praktikum, dan pengampu.</p>
          </div>
          <AdminButton onClick={() => openModal(activeTab)}><Plus size={16} />Tambah</AdminButton>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <AdminPanel>
          <div className="border-b border-gray-200 p-4">
            <AdminTabs tabs={tabs} active={activeTab} onChange={(tab) => { setActiveTab(tab as NativeTab); setKeyword("") }} />
            <div className="mt-4 max-w-sm">
              <AdminSearchInput value={keyword} onChange={setKeyword} placeholder="Cari data akademik" />
            </div>
          </div>
          <div className="p-4">{loading ? <p className="text-sm text-gray-500">Memuat data...</p> : renderTable()}</div>
        </AdminPanel>
      </div>

      {modal && (
        <AdminModal
          title={`${modal.item ? "Edit" : "Tambah"} ${tabs.find((item) => item.id === formTab)?.label}`}
          onClose={closeModal}
          footer={<><AdminButton variant="secondary" onClick={closeModal}>Batal</AdminButton><AdminButton disabled={submitting} type="submit" form="native-academic-form">{submitting ? "Menyimpan..." : "Simpan"}</AdminButton></>}
        >
          <form id="native-academic-form" className="space-y-4" onSubmit={submitForm}>
            {formTab === "tahun" && <><FieldRow label="Tahun Semester"><input className={inputClass} value={form.tahun_semester} onChange={(e) => setField("tahun_semester", e.target.value)} placeholder="2025/2026 Genap" required /></FieldRow><FieldRow label="Status"><AdminSelect value={form.status} onChange={(v) => setField("status", v)}>{statusOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
            {formTab === "kurikulum" && <><FieldRow label="Tahun Kurikulum"><input className={inputClass} value={form.tahun_kurikulum} onChange={(e) => setField("tahun_kurikulum", e.target.value)} placeholder="2025" required /></FieldRow><FieldRow label="Nama Kurikulum"><input className={inputClass} value={form.nama_kurikulum} onChange={(e) => setField("nama_kurikulum", e.target.value)} required /></FieldRow><FieldRow label="Status"><AdminSelect value={form.status} onChange={(v) => setField("status", v)}>{statusOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
            {formTab === "semester" && <FieldRow label="Semester"><input className={inputClass} type="number" min="1" value={form.semester} onChange={(e) => setField("semester", e.target.value)} required /></FieldRow>}
            {formTab === "kelas" && <FieldRow label="Kelas/Rombel"><input className={inputClass} value={form.kelas} onChange={(e) => setField("kelas", e.target.value.toUpperCase())} placeholder="A" required /></FieldRow>}
            {formTab === "mata-kuliah" && <><FieldRow label="Kode MK"><input className={inputClass} value={form.kode_mk} onChange={(e) => setField("kode_mk", e.target.value)} required /></FieldRow><FieldRow label="Nama MK"><input className={inputClass} value={form.nama_mk} onChange={(e) => setField("nama_mk", e.target.value)} required /></FieldRow><FieldRow label="SKS"><input className={inputClass} type="number" min="1" value={form.sks} onChange={(e) => setField("sks", e.target.value)} required /></FieldRow><FieldRow label="Tipe"><AdminSelect value={form.tipe} onChange={(v) => setField("tipe", v)}>{tipeOptions.map((v) => option(v, v))}</AdminSelect></FieldRow><FieldRow label="Kurikulum"><AdminSelect value={form.id_kurikulum} onChange={(v) => setField("id_kurikulum", v)} required><option value="">Pilih kurikulum</option>{kurikulum.map((i) => option(i.id, `${i.nama_kurikulum} (${i.tahun_kurikulum})`))}</AdminSelect></FieldRow><FieldRow label="Semester"><AdminSelect value={form.id_semester} onChange={(v) => setField("id_semester", v)} required><option value="">Pilih semester</option>{semester.map((i) => option(i.id, `Semester ${i.semester}`))}</AdminSelect></FieldRow></>}
            {formTab === "kelas-mahasiswa" && <><FieldRow label="Tahun Semester"><AdminSelect value={form.id_tahun_semester} onChange={(v) => setField("id_tahun_semester", v)} required><option value="">Pilih tahun semester</option>{tahunSemester.map((i) => option(i.id, i.tahun_semester))}</AdminSelect></FieldRow><FieldRow label="Semester"><AdminSelect value={form.id_semester} onChange={(v) => setField("id_semester", v)} required><option value="">Pilih semester</option>{semester.map((i) => option(i.id, `Semester ${i.semester}`))}</AdminSelect></FieldRow><FieldRow label="Kelas"><AdminSelect value={form.id_kelas} onChange={(v) => setField("id_kelas", v)} required><option value="">Pilih kelas</option>{kelas.map((i) => option(i.id, i.kelas))}</AdminSelect></FieldRow><FieldRow label="Mahasiswa"><AdminSelect value={form.id_mahasiswa} onChange={(v) => setField("id_mahasiswa", v)} required><option value="">Pilih mahasiswa</option>{students.map((i) => option(i.id, `${i.nim} - ${i.fullname}`))}</AdminSelect></FieldRow><FieldRow label="Status"><AdminSelect value={form.status} onChange={(v) => setField("status", v)}>{statusOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
            {formTab === "kelas-praktikum" && <><FieldRow label="Tahun Semester"><AdminSelect value={form.id_tahun_semester} onChange={(v) => setField("id_tahun_semester", v)} required><option value="">Pilih tahun semester</option>{tahunSemester.map((i) => option(i.id, i.tahun_semester))}</AdminSelect></FieldRow><FieldRow label="Mata Kuliah"><AdminSelect value={form.id_mata_kuliah} onChange={(v) => setField("id_mata_kuliah", v)} required><option value="">Pilih mata kuliah</option>{mataKuliah.map((i) => option(i.id, `${i.kode_mk} - ${i.nama_mk}`))}</AdminSelect></FieldRow><FieldRow label="Semester"><AdminSelect value={form.id_semester} onChange={(v) => setField("id_semester", v)} required><option value="">Pilih semester</option>{semester.map((i) => option(i.id, `Semester ${i.semester}`))}</AdminSelect></FieldRow><FieldRow label="Kelas"><AdminSelect value={form.id_kelas} onChange={(v) => setField("id_kelas", v)} required><option value="">Pilih kelas</option>{kelas.map((i) => option(i.id, i.kelas))}</AdminSelect></FieldRow><FieldRow label="Nama Kelas"><input className={inputClass} value={form.nama_kelas} onChange={(e) => setField("nama_kelas", e.target.value)} required /></FieldRow><FieldRow label="Status"><AdminSelect value={form.status} onChange={(v) => setField("status", v)}>{kelasPraktikumStatusOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
            {formTab === "pengampu" && <><FieldRow label="Kelas Praktikum"><AdminSelect value={form.id_kelas_praktikum} onChange={(v) => setField("id_kelas_praktikum", v)} required><option value="">Pilih kelas praktikum</option>{kelasPraktikum.map((i) => option(i.id, i.nama_kelas))}</AdminSelect></FieldRow><FieldRow label="Dosen"><AdminSelect value={form.id_dosen} onChange={(v) => setField("id_dosen", v)} required><option value="">Pilih dosen</option>{lecturers.map((i) => option(i.id, `${i.nip} - ${i.fullname}`))}</AdminSelect></FieldRow><FieldRow label="Peran"><AdminSelect value={form.peran} onChange={(v) => setField("peran", v)}>{peranOptions.map((v) => option(v, v))}</AdminSelect></FieldRow></>}
          </form>
        </AdminModal>
      )}

      {deleteTarget && (
        <AdminConfirmModal
          title="Hapus data?"
          message={`${deleteTarget.label} akan dihapus jika belum digunakan data lain.`}
          confirmLabel="Hapus"
          variant="danger"
          loading={submitting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AdminLayout>
  )
}
