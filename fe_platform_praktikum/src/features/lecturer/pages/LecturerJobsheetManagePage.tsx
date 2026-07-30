import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, BookOpen, FileText, Pencil, Plus, Trash2 } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { apiFetch } from "../../../services/api"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerModal,
  NativeSelect,
  PageHeader,
  SearchBox,
} from "../components/LecturerUI"
import {
  deleteLecturerJobsheet,
  getLecturerCourseDataset,
  publishLecturerJobsheet,
  type LecturerCourseDataset,
  type LecturerJobsheetSummary,
} from "../service"
import { toast } from "../../../components/toast/toastStore"
import { academicCourseBasePath } from "../../../services/academicScope"
import { datetimeLocalToDbValue, dbValueToDatetimeLocal, formatDeadlineLocal } from "../utils/deadline"

type PublishClassSetting = {
  classId: string
  kelasPraktikumId?: string
  className: string
  isActive: boolean
  deadline: string
  inactiveDurationMinutes: string
}

function IndonesianDateTimePicker({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const parts = value ? value.split("T") : ["", ""]
  const dateVal = parts[0] || ""
  const timeVal = parts[1] || "00:00"
  const [hourVal = "00", minuteVal = "00"] = timeVal.split(":")

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange("")
      return
    }
    const h = hourVal || "00"
    const m = minuteVal || "00"
    onChange(`${newDate}T${h.padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  const handleHourChange = (newHour: string) => {
    const d = dateVal || new Date().toISOString().slice(0, 10)
    const m = minuteVal || "00"
    onChange(`${d}T${newHour.padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  const handleMinuteChange = (newMinute: string) => {
    const d = dateVal || new Date().toISOString().slice(0, 10)
    const h = hourVal || "00"
    onChange(`${d}T${h.padStart(2, "0")}:${newMinute.padStart(2, "0")}`)
  }

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        value={dateVal}
        disabled={disabled}
        onChange={(e) => handleDateChange(e.target.value)}
        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      />
      <div className="flex items-center gap-1">
        <select
          value={hourVal.padStart(2, "0")}
          disabled={disabled}
          onChange={(e) => handleHourChange(e.target.value)}
          className="h-8 rounded-lg border border-gray-300 bg-white px-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          title="Pilih Jam (00 - 23 WIB)"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-xs font-bold text-gray-500">:</span>
        <select
          value={minuteVal.padStart(2, "0")}
          disabled={disabled}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="h-8 rounded-lg border border-gray-300 bg-white px-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          title="Pilih Menit (00 - 59)"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
          24 Jam
        </span>
      </div>
    </div>
  )
}

function renderClassAndDeadline(jobsheet: LecturerJobsheetSummary) {
  const activeSettings = jobsheet.classSettings?.filter((s) => s.isActive) || []

  if (activeSettings.length === 0) {
    return (
      <div className="mt-3 space-y-1 text-xs">
        <p className="text-gray-500">
          Submission: <strong className="text-gray-900">{jobsheet.submitted}/{jobsheet.total}</strong> Mahasiswa telah mengumpulkan
        </p>
        <p className="font-medium text-amber-800 italic bg-amber-50/80 border border-amber-200/60 px-2.5 py-1.5 rounded-lg inline-block">
          {jobsheet.status === "Draft" ? "Belum dipublish ke kelas mana pun" : "Belum digunakan di kelas mana pun"}
        </p>
      </div>
    )
  }

  const sortedSettings = [...activeSettings].sort((a, b) =>
    a.className.localeCompare(b.className, "id-ID", { numeric: true, sensitivity: "base" })
  )

  return (
    <div className="mt-3 space-y-2 text-xs">
      <p className="text-gray-500">
        Submission: <strong className="text-gray-900">{jobsheet.submitted}/{jobsheet.total}</strong> Mahasiswa telah mengumpulkan
      </p>

      <div className="rounded-xl border border-blue-100 bg-white/90 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1 border-b border-gray-100">
          <span>Kelas</span>
          <span>Deadline</span>
        </div>
        <div className="mt-1 divide-y divide-gray-50">
          {sortedSettings.map((s) => {
            const shortName = s.className.includes(" - ") ? s.className.split(" - ").pop()?.trim() || s.className : s.className
            const deadlineText = formatDeadlineLocal(s.deadline)
            const hasDeadline = s.deadline && s.deadline !== "-"

            return (
              <div key={s.classId} className="flex items-center justify-between py-1 text-xs">
                <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {shortName}
                </span>
                <span className={`font-semibold ${hasDeadline ? "text-purple-700" : "text-gray-400 font-medium"}`}>
                  {deadlineText}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function LecturerJobsheetManagePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get("classId")
  const { goBackToParent } = useBackNavigation()
  const { user } = useCurrentUser()
  const { courseId = "", mataKuliahId: routeMataKuliahId = "" } = useParams()
  const effectiveCourseId = routeMataKuliahId || courseId
  const [loading, setLoading] = useState(true)
  const [savingPublish, setSavingPublish] = useState(false)
  const [error, setError] = useState("")
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dataset, setDataset] = useState<LecturerCourseDataset | null>(null)
  const [publishTarget, setPublishTarget] = useState<LecturerJobsheetSummary | null>(null)
  const [publishSettings, setPublishSettings] = useState<PublishClassSetting[]>([])
  const [deleteTarget, setDeleteTarget] = useState<LecturerJobsheetSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false)
  const [editPlanValue, setEditPlanValue] = useState("1")
  const [savingPlan, setSavingPlan] = useState(false)

  const loadDataset = useCallback(async () => {
    if (!user || user.role !== "DOSEN" || !effectiveCourseId) return

    setLoading(true)
    setError("")

    try {
      const nextDataset = await getLecturerCourseDataset(user.id, effectiveCourseId)
      setDataset(nextDataset)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat dataset jobsheet dosen.")
    } finally {
      setLoading(false)
    }
  }, [effectiveCourseId, user])

  useEffect(() => {
    loadDataset()
  }, [loadDataset])

  const jobsheetBasePath = academicCourseBasePath(effectiveCourseId, { mataKuliahId: dataset?.course.mataKuliahId || dataset?.course.id || effectiveCourseId })

  const filteredJobsheets = useMemo(() => {
    if (!dataset) return []

    const searchKeyword = keyword.trim().toLowerCase()

    return dataset.jobsheets.filter((jobsheet) => {
      const matchKeyword =
        !searchKeyword ||
        [jobsheet.number, jobsheet.title].some((value) =>
          String(value).toLowerCase().includes(searchKeyword),
        )
      const matchStatus = statusFilter === "all" || jobsheet.status === statusFilter

      return matchKeyword && matchStatus
    })
  }, [dataset, keyword, statusFilter])

  useEffect(() => {
    if (!publishTarget || !dataset) {
      setPublishSettings([])
      return
    }

    const availableClasses = dataset.classDetails
    const nextSettings: PublishClassSetting[] = availableClasses.map((cls) => {
      const found = publishTarget.classSettings?.find(
        (entry) => entry.classId === cls.id || entry.kelasPraktikumId === cls.kelasPraktikumId,
      )

      return {
        classId: cls.id,
        kelasPraktikumId: cls.kelasPraktikumId || cls.id,
        className: cls.name,
        isActive: Boolean(found?.isActive),
        deadline: dbValueToDatetimeLocal(found?.deadline),
        inactiveDurationMinutes: found?.inactiveDurationMinutes ? String(found.inactiveDurationMinutes) : "",
      }
    })

    setPublishSettings(nextSettings)
  }, [dataset, publishTarget])

  const handleSavePublish = async () => {
    if (!publishTarget || !dataset) return

    setSavingPublish(true)

    try {
      await publishLecturerJobsheet(
        dataset.course.id,
        publishTarget.id,
        {
          classes: publishSettings.map((entry) => ({
            classId: entry.classId,
            kelasPraktikumId: entry.kelasPraktikumId,
            isActive: entry.isActive,
            deadline: datetimeLocalToDbValue(entry.deadline),
            inactiveDurationMinutes: entry.inactiveDurationMinutes ? Number(entry.inactiveDurationMinutes) : null,
          })),
        },
        { mataKuliahId: dataset.course.mataKuliahId || dataset.course.id },
      )

      setPublishTarget(null)
      toast.success("Pengaturan jobsheet berhasil disimpan.")
      await loadDataset()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Gagal menyimpan pengaturan jobsheet.")
    } finally {
      setSavingPublish(false)
    }
  }

  const handleDeleteJobsheet = async () => {
    if (!deleteTarget || !dataset) return

    setDeleting(true)

    try {
      await deleteLecturerJobsheet(dataset.course.id, deleteTarget.id, { mataKuliahId: dataset.course.mataKuliahId || dataset.course.id })
      setDeleteTarget(null)
      toast.success("Jobsheet berhasil dihapus.")
      await loadDataset()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Gagal menghapus jobsheet.")
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveJobsheetPlan = async () => {
    if (!dataset || !dataset.classDetails.length) return
    const nextPlan = parseInt(editPlanValue, 10)
    if (!nextPlan || nextPlan < 1) {
      toast.error("Jumlah jobsheet rencana harus berupa angka minimal 1.")
      return
    }

    setSavingPlan(true)
    try {
      await Promise.all(
        dataset.classDetails.map((cls) => {
          const kpId = cls.kelasPraktikumId || cls.id
          return apiFetch(`/lecturer/kelas-praktikum/${kpId}/plan`, {
            method: "PATCH",
            body: JSON.stringify({ jumlah_jobsheet_rencana: nextPlan }),
          })
        })
      )
      toast.success("Rencana jobsheet mata kuliah berhasil diperbarui.")
      setIsEditPlanModalOpen(false)
      await loadDataset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui rencana jobsheet.")
    } finally {
      setSavingPlan(false)
    }
  }

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <button
        type="button"
        onClick={() => {
          goBackToParent({
            parentPath: classId 
              ? `/kelas-praktikum/${effectiveCourseId}/${classId}` 
              : "/mata-kuliah",
            fallbackPath: "/mata-kuliah",
            preserveQueryParams: ["courseId", "classId", "mataKuliahId", "kelasPraktikumId"],
          })
        }}
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={16} />
        Kembali ke Navigasi Utama
      </button>

      <PageHeader
        title="Kelola Jobsheet Praktikum"
        subtitle={`Manajemen materi jobsheet & alokasi untuk mata kuliah ${dataset?.course.name ?? "-"}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <LecturerButton
              variant="secondary"
              onClick={() => {
                const currentPlan = (dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 1
                setEditPlanValue(String(currentPlan))
                setIsEditPlanModalOpen(true)
              }}
            >
              <Pencil size={15} />
              Atur Rencana Jobsheet ({(dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 1})
            </LecturerButton>
            <LecturerButton onClick={() => navigate(`${jobsheetBasePath}/create`)}>
              <Plus size={16} />
              Tambah Jobsheet Baru
            </LecturerButton>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}



      {!dataset?.jobsheets.length ? (
        <LecturerEmptyState
          title="Belum ada jobsheet praktikum untuk mata kuliah ini."
          action={
            <LecturerButton onClick={() => navigate(`${jobsheetBasePath}/create`)}>
              <Plus size={16} />
              Tambah Jobsheet
            </LecturerButton>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" /> Daftar Jobsheet Praktikum
            </h3>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
                <option value="all">Semua Status Jobsheet</option>
                <option value="Published">Published (Terbit)</option>
                <option value="Draft">Draft (Konsep)</option>
                <option value="Nonaktif">Nonaktif</option>
                <option value="Arsip">Arsip</option>
              </NativeSelect>
              <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet..." className="w-full sm:w-64" />
            </div>
          </div>

          {!filteredJobsheets.length ? (
            <div className="py-8">
              <LecturerEmptyState title="Tidak ada jobsheet yang cocok dengan filter." />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredJobsheets.map((jobsheet) => {
                const isPublished = jobsheet.status === "Published" || jobsheet.status === "Selesai"
                const statusBadgeClass = isPublished
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : jobsheet.status === "Draft"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"

                return (
                  <div
                    key={jobsheet.id}
                    className="flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-base font-bold text-gray-900">
                          <BookOpen size={18} className="text-blue-600" /> Jobsheet {jobsheet.number} - {jobsheet.title}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass}`}>
                          {jobsheet.status}
                        </span>
                      </div>

                      {renderClassAndDeadline(jobsheet)}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                      <LecturerButton variant="secondary" onClick={() => navigate(`${jobsheetBasePath}/${jobsheet.id}/edit`)}>
                        Edit Isi Jobsheet
                      </LecturerButton>
                      <LecturerButton variant="secondary" onClick={() => setPublishTarget(jobsheet)}>
                        Atur Kelas &amp; Deadline
                      </LecturerButton>
                      <LecturerButton variant="secondary" onClick={() => setDeleteTarget(jobsheet)}>
                        <Trash2 size={15} className="text-red-500" />
                        Hapus
                      </LecturerButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {publishTarget && dataset && (
        <LecturerModal
          title={`Pengaturan Alokasi Jobsheet ${publishTarget.number}`}
          onClose={() => setPublishTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setPublishTarget(null)}>Batal</LecturerButton>
              <LecturerButton disabled={savingPublish} onClick={handleSavePublish}>
                {savingPublish ? "Menyimpan..." : "Simpan Pengaturan"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
              Pilih kelas praktikum mana saja yang dapat mengakses jobsheet ini dan tetapkan batas waktu (deadline) pengumpulannya.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Aktifkan untuk Kelas</p>
                {publishSettings.map((item, index) => (
                  <label key={item.classId} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={() =>
                        setPublishSettings((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index
                              ? { ...entry, isActive: !entry.isActive }
                              : entry,
                          ),
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Kelas Praktikum {item.className}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Batas Waktu (Deadline - 24 Jam)</p>
                {publishSettings.map((item, index) => (
                  <IndonesianDateTimePicker
                    key={item.classId}
                    value={item.deadline}
                    disabled={!item.isActive}
                    onChange={(newVal) =>
                      setPublishSettings((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index
                            ? { ...entry, deadline: newVal }
                            : entry,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </LecturerModal>
      )}

      {deleteTarget && (
        <LecturerModal
          title="Konfirmasi Hapus Jobsheet"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</LecturerButton>
              <LecturerButton disabled={deleting} onClick={handleDeleteJobsheet}>
                {deleting ? "Menghapus..." : "Hapus Jobsheet"}
              </LecturerButton>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            Apakah Anda yakin ingin menghapus <strong>Jobsheet {deleteTarget.number} - {deleteTarget.title}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </LecturerModal>
      )}

      {isEditPlanModalOpen && dataset && (
        <LecturerModal
          title="Ubah Jumlah Jobsheet Rencana"
          onClose={() => setIsEditPlanModalOpen(false)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setIsEditPlanModalOpen(false)}>Batal</LecturerButton>
              <LecturerButton disabled={savingPlan} onClick={handleSaveJobsheetPlan}>
                {savingPlan ? "Menyimpan..." : "Simpan Rencana"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Tentukan jumlah target jobsheet praktikum yang direncanakan untuk mata kuliah <strong>{dataset.course.name}</strong> selama 1 semester.
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Jumlah Jobsheet Rencana</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-blue-600 focus:outline-none"
                value={editPlanValue}
                onChange={(e) => setEditPlanValue(e.target.value)}
                placeholder="Contoh: 10"
              />
            </div>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
