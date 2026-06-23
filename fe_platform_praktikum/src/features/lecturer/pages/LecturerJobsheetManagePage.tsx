import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useBackNavigation } from "../../../shared/utils/backNavigation"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerModal,
  LecturerPanel,
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
}

function renderUsedIn(jobsheet: LecturerJobsheetSummary) {
  const activeSettings = jobsheet.classSettings?.filter((s) => s.isActive) || []
  if (activeSettings.length === 0) {
    if (jobsheet.status === "Draft") {
      return "Digunakan di: Belum dipublish"
    }
    return "Belum digunakan di kelas mana pun"
  }
  const sortedClassNames = [...activeSettings]
    .sort((a, b) => a.className.localeCompare(b.className, "id-ID", { numeric: true, sensitivity: "base" }))
    .map((s) => `Kelas Praktikum ${s.className}`)
  return `Digunakan di: ${sortedClassNames.join(", ")}`
}

function renderDeadline(jobsheet: LecturerJobsheetSummary) {
  const activeSettings = jobsheet.classSettings?.filter((s) => s.isActive) || []

  if (activeSettings.length === 0) {
    return <p className="text-sm text-gray-700">Deadline: Belum diatur</p>
  }

  const settingsWithDeadline = activeSettings.filter((s) => s.deadline && s.deadline !== "-")

  if (settingsWithDeadline.length === 0) {
    return <p className="text-sm text-gray-700">Deadline: Belum diatur</p>
  }

  const firstDeadline = settingsWithDeadline[0].deadline
  const allSame = settingsWithDeadline.every((s) => s.deadline === firstDeadline) && settingsWithDeadline.length === activeSettings.length

  if (allSame) {
    return <p className="text-sm text-gray-700">Deadline: {formatDeadlineLocal(firstDeadline)}</p>
  }

  const sortedSettings = [...activeSettings].sort((a, b) =>
    a.className.localeCompare(b.className, "id-ID", { numeric: true, sensitivity: "base" })
  )

  return (
    <div className="text-sm text-gray-700">
      <span>Deadline:</span>
      <ul className="ml-4 mt-1 list-disc space-y-0.5">
        {sortedSettings.map((s) => {
          const deadlineText = formatDeadlineLocal(s.deadline)
          return (
            <li key={s.classId}>
              Kelas Praktikum {s.className}: {deadlineText}
            </li>
          )
        })}
      </ul>
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

  const loadDataset = useCallback(async () => {
    if (!user || user.role !== "DOSEN" || !effectiveCourseId) return

    setLoading(true)
    setError("")

    try {
      const nextDataset = await getLecturerCourseDataset(user.id, effectiveCourseId)
      setDataset(nextDataset)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat jobsheet dosen.")
    } finally {
      setLoading(false)
    }
  }, [effectiveCourseId, user])

  useEffect(() => {
    loadDataset()
  }, [loadDataset])

  const courseScope = { mataKuliahId: dataset?.course.mataKuliahId || routeMataKuliahId || undefined }
  const jobsheetBasePath = `${academicCourseBasePath(effectiveCourseId, courseScope)}/jobsheets`

  const filteredJobsheets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return (dataset?.jobsheets ?? [])
      .filter((jobsheet) => statusFilter === "all" || jobsheet.status === statusFilter)
      .filter((jobsheet) => !normalized || jobsheet.title.toLowerCase().includes(normalized))
  }, [dataset?.jobsheets, keyword, statusFilter])

  useEffect(() => {
    if (!publishTarget || !dataset) return

    setPublishSettings(
      dataset.course.classes.map((item) => {
        const existing = publishTarget.classSettings?.find(
          (setting) => setting.classId === item.id,
        )

        return {
          classId: item.id,
          kelasPraktikumId: item.kelasPraktikumId || item.id_kelas_praktikum,
          className: item.name,
          isActive: existing ? existing.isActive : false,
          deadline: dbValueToDatetimeLocal(existing?.deadline),
        }
      }),
    )
  }, [dataset, publishTarget])

  async function handleSavePublish() {
    if (!user || !publishTarget) return

    try {
      setSavingPublish(true)
      setError("")

      await publishLecturerJobsheet(effectiveCourseId, publishTarget.id, {
        lecturerId: user.id,
        classes: publishSettings.map((item) => ({
          kelasPraktikumId: item.kelasPraktikumId,
          deadline: datetimeLocalToDbValue(item.deadline),
          isActive: item.isActive,
        })),
      }, { mataKuliahId: dataset?.course.mataKuliahId || dataset?.course.id })

      setPublishTarget(null)
      toast.success("Pengaturan jobsheet berhasil diperbarui.")
      await loadDataset()
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "Gagal menyimpan pengaturan jobsheet.")
    } finally {
      setSavingPublish(false)
    }
  }

  async function handleDeleteJobsheet() {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await deleteLecturerJobsheet(effectiveCourseId, deleteTarget.id, {
        mataKuliahId: dataset?.course.mataKuliahId || dataset?.course.id,
      })
      toast.success("Jobsheet berhasil dihapus.")
      setDeleteTarget(null)
      await loadDataset()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Gagal menghapus jobsheet.")
    } finally {
      setDeleting(false)
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
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title="Kelola Jobsheet"
        subtitle={`Mata Kuliah: ${dataset?.course.name ?? "-"}`}
        right={
          <LecturerButton onClick={() => navigate(`${jobsheetBasePath}/create`)}>
            <Plus size={16} />
            Tambah Jobsheet
          </LecturerButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <LecturerPanel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-end">
            <NativeSelect value={statusFilter} onChange={setStatusFilter} label="">
              <option value="all">Semua Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Arsip">Arsip</option>
            </NativeSelect>
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet" />
          </div>

          {!filteredJobsheets.length ? (
            <div className="p-5">
              <LecturerEmptyState title="Tidak ada jobsheet yang cocok dengan filter." />
            </div>
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {filteredJobsheets.map((jobsheet) => (
                <LecturerPanel key={jobsheet.id} className="bg-blue-50 p-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Jobsheet {jobsheet.number} - {jobsheet.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-700">Status: {jobsheet.status}</p>
                  <p className="text-sm text-gray-700">
                    {renderUsedIn(jobsheet)}
                  </p>
                  <p className="text-sm text-gray-700">Submit: {jobsheet.submitted}/{jobsheet.total} mahasiswa</p>
                  {renderDeadline(jobsheet)}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <LecturerButton variant="secondary" onClick={() => navigate(`${jobsheetBasePath}/${jobsheet.id}/edit`)}>
                      Edit
                    </LecturerButton>
                    <LecturerButton variant="secondary" onClick={() => setPublishTarget(jobsheet)}>
                      Pengaturan
                    </LecturerButton>
                    <LecturerButton variant="secondary" onClick={() => setDeleteTarget(jobsheet)}>
                      <Trash2 size={16} />
                      Hapus
                    </LecturerButton>
                  </div>
                </LecturerPanel>
              ))}
            </div>
          )}
        </LecturerPanel>
      )}

      {publishTarget && dataset && (
        <LecturerModal
          title="Pengaturan Jobsheet"
          onClose={() => setPublishTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setPublishTarget(null)}>Tutup</LecturerButton>
              <LecturerButton disabled={savingPublish} onClick={handleSavePublish}>
                {savingPublish ? "Menyimpan..." : "Simpan"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="font-semibold">Kelas Praktikum</p>
                {publishSettings.map((item, index) => (
                  <label key={item.classId} className="flex items-center gap-2 text-sm">
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
                    />
                    Kelas Praktikum {item.className}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <p className="font-semibold">Deadline Pengumpulan</p>
                {publishSettings.map((item, index) => (
                  <input
                    key={item.classId}
                    type="datetime-local"
                    value={item.deadline}
                    disabled={!item.isActive}
                    onChange={(event) =>
                      setPublishSettings((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, deadline: event.target.value } : entry,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    aria-label={`Deadline kelas ${item.className}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </LecturerModal>
      )}
      {deleteTarget && (
        <LecturerModal
          title="Hapus Jobsheet"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</LecturerButton>
              <LecturerButton disabled={deleting} onClick={handleDeleteJobsheet}>
                {deleting ? "Menghapus..." : "Hapus"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Jobsheet <span className="font-semibold">{deleteTarget.title}</span> akan dihapus.
            </p>
            <p>
              Jobsheet hanya bisa dihapus jika belum digunakan di kelas mana pun.
            </p>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
