import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import TopProgressBar from "../../../components/loading/TopProgressBar"
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
  getLecturerCourseDataset,
  publishLecturerJobsheet,
  type LecturerCourseDataset,
  type LecturerJobsheetSummary,
} from "../service"

type PublishClassSetting = {
  classId: string
  className: string
  isActive: boolean
  deadline: string
}

function toDatetimeLocal(value: string | undefined) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const offset = parsed.getTimezoneOffset()
  const local = new Date(parsed.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function LecturerJobsheetManagePage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { courseId = "" } = useParams()
  const [loading, setLoading] = useState(true)
  const [savingPublish, setSavingPublish] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dataset, setDataset] = useState<LecturerCourseDataset | null>(null)
  const [publishTarget, setPublishTarget] = useState<LecturerJobsheetSummary | null>(null)
  const [publishSettings, setPublishSettings] = useState<PublishClassSetting[]>([])

  async function loadDataset() {
    if (!user || user.role !== "DOSEN" || !courseId) return

    setLoading(true)
    setError("")

    try {
      const nextDataset = await getLecturerCourseDataset(user.id, courseId)
      setDataset(nextDataset)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat jobsheet dosen.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDataset()
  }, [courseId, user])

  const filteredJobsheets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return (dataset?.jobsheets ?? [])
      .filter((jobsheet) => statusFilter === "all" || jobsheet.status === statusFilter)
      .filter((jobsheet) => !normalized || jobsheet.title.toLowerCase().includes(normalized))
  }, [dataset?.jobsheets, keyword, statusFilter])

  useEffect(() => {
    if (!publishTarget || !dataset) return

    setPublishSettings(
      dataset.course.classes.map((item) => ({
        classId: item.id,
        className: item.name,
        isActive: publishTarget.usedIn.includes(item.name),
        deadline: toDatetimeLocal(publishTarget.deadline),
      })),
    )
  }, [dataset, publishTarget])

  async function handleSavePublish() {
    if (!user || !publishTarget) return

    try {
      setSavingPublish(true)
      setError("")
      setSuccessMessage("")

      await publishLecturerJobsheet(courseId, publishTarget.id, {
        lecturerId: user.id,
        classes: publishSettings.map((item) => ({
          classId: item.classId,
          deadline: item.deadline,
          isActive: item.isActive,
        })),
      })

      setPublishTarget(null)
      setSuccessMessage("Pengaturan jobsheet berhasil diperbarui.")
      await loadDataset()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Gagal menyimpan pengaturan jobsheet.")
    } finally {
      setSavingPublish(false)
    }
  }

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <PageHeader
        title="Kelola Jobsheet"
        subtitle={`Mata Kuliah: ${dataset?.course.name ?? "-"}`}
        right={
          <LecturerButton onClick={() => navigate(`/courses/${courseId}/jobsheets/create`)}>
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

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {!dataset?.jobsheets.length ? (
        <LecturerEmptyState
          title="Belum ada jobsheet praktikum untuk mata kuliah ini."
          action={
            <LecturerButton onClick={() => navigate(`/courses/${courseId}/jobsheets/create`)}>
              <Plus size={16} />
              Tambah Jobsheet
            </LecturerButton>
          }
        />
      ) : (
        <LecturerPanel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-end">
            <NativeSelect value={statusFilter} onChange={setStatusFilter} label="Status jobsheet">
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
                    Digunakan di: {jobsheet.usedIn.length ? jobsheet.usedIn.map((item) => `Kelas ${item}`).join(", ") : "-"}
                  </p>
                  <p className="text-sm text-gray-700">Submit: {jobsheet.submitted}/{jobsheet.total} mahasiswa</p>
                  <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <LecturerButton variant="secondary" onClick={() => navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}/edit`)}>
                      Edit
                    </LecturerButton>
                    <LecturerButton variant="secondary" onClick={() => setPublishTarget(jobsheet)}>
                      Pengaturan
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
                <p className="font-semibold">Kelas</p>
                {publishSettings.map((item, index) => (
                  <label key={item.classId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={() =>
                        setPublishSettings((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...entry, isActive: !entry.isActive } : entry,
                          ),
                        )
                      }
                    />
                    Kelas {item.className}
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
                    onChange={(event) =>
                      setPublishSettings((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, deadline: event.target.value } : entry,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                    aria-label={`Deadline kelas ${item.className}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
