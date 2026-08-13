import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react"
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
  getLecturerJobsheetById,
  publishLecturerJobsheet,
  type LecturerCourseDataset,
  type LecturerJobsheetSummary,
} from "../service"
import type { Jobsheet } from "../../../services/jobsheet/types"
import { IndonesianDateTimePicker } from "../components/IndonesianDateTimePicker"
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

  // ── Modal Salin Dari Semester Lain State ──
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [availableCopyJobsheets, setAvailableCopyJobsheets] = useState<Array<{ id: string; title: string; description: string }>>([])
  const [loadingCopyList, setLoadingCopyList] = useState(false)
  const [copyPreviewJobsheet, setCopyPreviewJobsheet] = useState<Jobsheet | null>(null)

  const handleOpenCopyModal = useCallback(async () => {
    setIsCopyModalOpen(true)
    setCopyPreviewJobsheet(null)
    setLoadingCopyList(true)
    try {
      const res = await apiFetch(`/mata-kuliah/${dataset?.course.mataKuliahId || dataset?.course.id || effectiveCourseId}/jobsheets`)
      setAvailableCopyJobsheets(res.data?.jobsheets ?? [])
    } catch (err) {
      toast.error("Gagal memuat daftar jobsheet: " + (err instanceof Error ? err.message : ""))
    } finally {
      setLoadingCopyList(false)
    }
  }, [dataset, effectiveCourseId])

  const isHistoryScope = searchParams.get("scope") === "history"
  const loadDataset = useCallback(async () => {
    if (!user || user.role !== "DOSEN" || !effectiveCourseId) return

    setLoading(true)
    setError("")

    try {
      const nextDataset = await getLecturerCourseDataset(user.id, effectiveCourseId, isHistoryScope ? { scope: "history" } : {})
      setDataset(nextDataset)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat dataset jobsheet dosen.")
    } finally {
      setLoading(false)
    }
  }, [effectiveCourseId, isHistoryScope, user])

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
    if (isNaN(nextPlan) || nextPlan < 0) {
      toast.error("Jumlah jobsheet harus berupa angka minimal 0.")
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
      toast.success("Jumlah jobsheet mata kuliah berhasil diperbarui.")
      setIsEditPlanModalOpen(false)
      await loadDataset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui jumlah jobsheet.")
    } finally {
      setSavingPlan(false)
    }
  }

  const checkPlanLimitAndNavigate = (targetUrl: string) => {
    // Hanya hitung jobsheet yang sudah tidak berstatus Draft (misal Published/Selesai/Aktif)
    const createdCount = dataset?.jobsheets.filter(j => j.status?.toLowerCase() !== "draft").length ?? 0
    const plannedCount = (dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 0

    if (createdCount >= plannedCount) {
      toast.warning(
        `Jumlah jobsheet yang dibuat (${createdCount}) sudah mencapai batas Jumlah Jobsheet (${plannedCount}). Silakan ubah Jumlah Jobsheet terlebih dahulu jika ingin menambah jobsheet baru.`
      )
      return false
    }

    navigate(targetUrl)
    return true
  }

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout
      onBack={() => {
        goBackToParent({
          parentPath: classId
            ? `/kelas-praktikum/${courseId}/${classId}`
            : courseId
              ? `/mata-kuliah/${courseId}/jobsheets`
              : "/mata-kuliah",
          fallbackPath: "/mata-kuliah",
          preserveQueryParams: ["courseId", "classId", "mataKuliahId", "kelasPraktikumId"],
        })
      }}
    >
      <PageHeader
        title="Kelola Jobsheet"
        subtitle={dataset?.course.name ?? "-"}
        right={
          <div className="flex flex-nowrap items-center gap-2 pt-1 overflow-x-auto shrink-0 max-w-full">
            <LecturerButton
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                const currentPlan = (dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 0
                setEditPlanValue(String(currentPlan))
                setIsEditPlanModalOpen(true)
              }}
            >
              <Pencil size={15} />
              <span>Jumlah Jobsheet ({(dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 0})</span>
            </LecturerButton>
            <LecturerButton variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => {
              const createdCount = dataset?.jobsheets.filter(j => j.status?.toLowerCase() !== "draft").length ?? 0
              const plannedCount = (dataset?.classDetails[0] as any)?.jumlahJobsheetRencana ?? (dataset?.classDetails[0] as any)?.jumlah_jobsheet_rencana ?? 0
              if (createdCount >= plannedCount) {
                toast.warning(`Jumlah jobsheet yang dibuat (${createdCount}) sudah mencapai batas Jumlah Jobsheet (${plannedCount}). Silakan ubah Jumlah Jobsheet terlebih dahulu jika ingin menambah jobsheet baru.`)
                return
              }
              handleOpenCopyModal()
            }}>
              <Copy size={15} />
              <span>Salin Dari Semester Lain</span>
            </LecturerButton>
            <LecturerButton className="shrink-0 whitespace-nowrap" onClick={() => checkPlanLimitAndNavigate(`${jobsheetBasePath}/create`)}>
              <Plus size={16} />
              <span>Tambah Jobsheet Baru</span>
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
                <option value="Published">Publish</option>
                <option value="Draft">Draf</option>
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
                const statusBadgeClass = jobsheet.status === "Arsip"
                  ? "bg-purple-50 text-purple-800 border-purple-200"
                  : isPublished
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
                      onChange={(e) => {
                        const nextValue = e.target.checked;
                        setPublishSettings((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index
                              ? { ...entry, isActive: nextValue }
                              : entry,
                          ),
                        )
                      }}
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
          title="Ubah Jumlah Jobsheet"
          onClose={() => setIsEditPlanModalOpen(false)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setIsEditPlanModalOpen(false)}>Batal</LecturerButton>
              <LecturerButton disabled={savingPlan} onClick={handleSaveJobsheetPlan}>
                {savingPlan ? "Menyimpan..." : "Simpan Target"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Tentukan jumlah target jobsheet praktikum yang direncanakan untuk mata kuliah <strong>{dataset.course.name}</strong> selama 1 semester.
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Jumlah Jobsheet</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-blue-600 focus:outline-none"
                value={editPlanValue}
                onChange={(e) => setEditPlanValue(e.target.value)}
                placeholder="Contoh: 10"
              />
            </div>
          </div>
        </LecturerModal>
      )}
      {/* Modal Salin Jobsheet Dari Semester Lain */}
      {isCopyModalOpen && (
        <LecturerModal
          title="Salin Jobsheet Dari Semester Lain"
          onClose={() => {
            setIsCopyModalOpen(false)
            setCopyPreviewJobsheet(null)
          }}
          footer={
            <div className="flex items-center justify-between w-full">
              {copyPreviewJobsheet ? (
                <LecturerButton variant="secondary" onClick={() => setCopyPreviewJobsheet(null)}>
                  ← Kembali ke Daftar Jobsheet
                </LecturerButton>
              ) : (
                <span className="text-xs text-gray-500">Pilih jobsheet yang ingin disalin ke semester aktif ini.</span>
              )}
              <LecturerButton variant="secondary" onClick={() => {
                setIsCopyModalOpen(false)
                setCopyPreviewJobsheet(null)
              }}>
                Tutup
              </LecturerButton>
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {copyPreviewJobsheet ? (
              /* Tampilan Detail Preview Jobsheet yang akan disalin */
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Preview Detail Jobsheet</span>
                      <h4 className="text-base font-bold text-gray-900 mt-0.5">{copyPreviewJobsheet.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{copyPreviewJobsheet.description || "Tidak ada deskripsi singkat."}</p>
                    </div>
                    <LecturerButton
                      onClick={() => {
                        if (checkPlanLimitAndNavigate(`${jobsheetBasePath}/create?sourceJobsheetId=${copyPreviewJobsheet.id}`)) {
                          setIsCopyModalOpen(false)
                        }
                      }}
                    >
                      <Copy size={15} />
                      Gunakan &amp; Salin Jobsheet Ini
                    </LecturerButton>
                  </div>
                </div>

                {copyPreviewJobsheet.goal && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tujuan Pembelajaran</p>
                    <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">{copyPreviewJobsheet.goal}</p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Dasar Teori</p>
                    <p className="text-lg font-extrabold text-blue-900 mt-1">{copyPreviewJobsheet.theory.length} Subtopik</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Percobaan</p>
                    <p className="text-lg font-extrabold text-indigo-900 mt-1">{copyPreviewJobsheet.experiments.length} Modul</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Latihan</p>
                    <p className="text-lg font-extrabold text-purple-900 mt-1">{copyPreviewJobsheet.exercises.length} Soal</p>
                  </div>
                </div>

                {copyPreviewJobsheet.theory.length > 0 && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Daftar Subtopik Dasar Teori</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
                      {copyPreviewJobsheet.theory.map((t, idx) => (
                        <li key={t.id || idx}><strong>{t.title}</strong> {t.rubric ? `(Bobot: ${t.rubric}%)` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {copyPreviewJobsheet.experiments.length > 0 && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Daftar Percobaan Praktikum</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
                      {copyPreviewJobsheet.experiments.map((e, idx) => (
                        <li key={e.id || idx}><strong>{e.title}</strong> {e.rubric ? `(Bobot: ${e.rubric}%)` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {copyPreviewJobsheet.exercises.length > 0 && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Daftar Soal Latihan Mandiri</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
                      {copyPreviewJobsheet.exercises.map((ex, idx) => (
                        <li key={ex.id || idx}><strong>{ex.title}</strong> {ex.rubric ? `(Bobot: ${ex.rubric}%)` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* Tampilan Daftar Jobsheet Tersedia */
              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  Berikut adalah daftar seluruh master jobsheet praktikum yang pernah dibuat untuk mata kuliah <strong>{dataset?.course.name}</strong>:
                </p>

                {loadingCopyList ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">Memuat daftar jobsheet...</div>
                ) : availableCopyJobsheets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">Belum ada jobsheet dari semester terdahulu.</div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                    {availableCopyJobsheets.map((job) => (
                      <div key={job.id} className="p-3.5 hover:bg-gray-50 flex items-center justify-between transition-colors">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{job.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{job.description || "Master Jobsheet Praktikum"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setLoadingCopyList(true)
                                const fullJob = await getLecturerJobsheetById(effectiveCourseId, job.id, {
                                  mataKuliahId: dataset?.course.mataKuliahId || dataset?.course.id || effectiveCourseId,
                                })
                                setCopyPreviewJobsheet(fullJob)
                              } catch (err) {
                                toast.error("Gagal memuat detail jobsheet: " + (err instanceof Error ? err.message : ""))
                              } finally {
                                setLoadingCopyList(false)
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                          >
                            Preview Detail
                          </button>
                          <LecturerButton
                            onClick={() => {
                              if (checkPlanLimitAndNavigate(`${jobsheetBasePath}/create?sourceJobsheetId=${job.id}`)) {
                                setIsCopyModalOpen(false)
                              }
                            }}
                          >
                            <Copy size={13} />
                            Salin Jobsheet
                          </LecturerButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
