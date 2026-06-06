import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerModal, LecturerPanel, NativeSelect, PageHeader, SearchBox } from "../components/LecturerUI"
import { getCourse, lecturerJobsheets, type LecturerJobsheet } from "../data/dummy"

export default function LecturerJobsheetManagePage() {
  const { courseId = "pbo" } = useParams()
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [publishTarget, setPublishTarget] = useState<LecturerJobsheet | null>(null)
  const [activeClassIds, setActiveClassIds] = useState(["A", "C"])
  const navigate = useNavigate()
  const course = getCourse(courseId)

  const filteredJobsheets = useMemo(
    () =>
      lecturerJobsheets
        .filter((jobsheet) => jobsheet.courseId === course.id)
        .filter((jobsheet) => statusFilter === "all" || jobsheet.status === statusFilter)
        .filter((jobsheet) => jobsheet.title.toLowerCase().includes(keyword.trim().toLowerCase())),
    [course.id, keyword, statusFilter],
  )

  const toggleClass = (className: string) => {
    setActiveClassIds((current) =>
      current.includes(className)
        ? current.filter((item) => item !== className)
        : [...current, className],
    )
  }

  return (
    <LecturerLayout>
      <PageHeader
        title="Kelola Jobsheet"
        subtitle={`Mata Kuliah: ${course.name}`}
        right={
          <LecturerButton onClick={() => navigate(`/courses/${course.id}/jobsheets/create`)}>
            <Plus size={16} />
            Tambah Jobsheet
          </LecturerButton>
        }
      />

      <LecturerPanel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-end">
          <NativeSelect value={statusFilter} onChange={setStatusFilter} label="Status jobsheet">
            <option value="all">Semua Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Nonaktif">Nonaktif</option>
          </NativeSelect>
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Jobsheet" />
        </div>

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
              <p className="text-sm text-gray-700">Dibuat: 1 Januari 2026</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <LecturerButton variant="secondary" onClick={() => navigate(`/courses/${course.id}/jobsheets/${jobsheet.id}/edit`)}>
                  Edit
                </LecturerButton>
                <LecturerButton variant="secondary" onClick={() => setPublishTarget(jobsheet)}>
                  Pengaturan
                </LecturerButton>
              </div>
            </LecturerPanel>
          ))}
        </div>
      </LecturerPanel>

      {publishTarget && (
        <LecturerModal
          title="Publikasikan Jobsheet"
          onClose={() => setPublishTarget(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setPublishTarget(null)}>Batal</LecturerButton>
              <LecturerButton onClick={() => setPublishTarget(null)}>Publikasikan</LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              Jobsheet {publishTarget.number} akan tersedia pada kelas yang dipilih.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="font-semibold">Kelas</p>
                {course.classes.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeClassIds.includes(item.name)}
                      onChange={() => toggleClass(item.name)}
                    />
                    Kelas {item.name}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <p className="font-semibold">Deadline Pengumpulan</p>
                {course.classes.map((item) => (
                  <input
                    key={item.id}
                    type="date"
                    defaultValue="2026-06-22"
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    aria-label={`Deadline kelas ${item.name}`}
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
