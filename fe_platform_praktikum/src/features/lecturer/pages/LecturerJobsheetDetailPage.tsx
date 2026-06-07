import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import type { Jobsheet } from "../../../services/jobsheet/types"
import LecturerLayout from "../components/LecturerLayout"
import {
  LecturerButton,
  LecturerEmptyState,
  LecturerPanel,
  LecturerTable,
  NativeSelect,
  PageHeader,
  SearchBox,
  TabButton,
} from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerJobsheetById,
  getLecturerSubmissionMatrix,
  getSubmissionReviewStatus,
  type LecturerSubmissionMatrixItem,
} from "../service"

type DetailTab = "detail" | "students" | "settings"

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "detail", label: "Detail Jobsheet" },
  { id: "students", label: "Mahasiswa" },
  { id: "settings", label: "Pengaturan" },
]

export default function LecturerJobsheetDetailPage() {
  const navigate = useNavigate()
  const { jobsheetId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId") ?? ""
  const classId = searchParams.get("classId") ?? ""
  const [activeTab, setActiveTab] = useState<DetailTab>("detail")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [matrix, setMatrix] = useState<LecturerSubmissionMatrixItem[]>([])

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) {
        setLoading(false)
        setError("Context courseId atau jobsheetId tidak lengkap.")
        return
      }

      setLoading(true)
      setError("")

      try {
        const selectedJobsheet = await getLecturerJobsheetById(courseId, jobsheetId)
        setJobsheet(selectedJobsheet)

        if (classId) {
          const classDetail = await getLecturerClassDetail(classId)
          const submissionMatrix = await getLecturerSubmissionMatrix(
            classDetail.courseId,
            classDetail.jobsheets.filter((item) => item.id === jobsheetId),
            classDetail.students,
          )
          setMatrix(submissionMatrix)
        } else {
          setMatrix([])
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail jobsheet.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId, courseId, jobsheetId])

  const filteredStudents = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

    return matrix.filter((item) => {
      const matchKeyword =
        !normalized ||
        [item.student.fullname, item.student.nim].some((value) => value.toLowerCase().includes(normalized))
      const reviewStatus = getSubmissionReviewStatus(item.submission)
      const matchStatus = status === "all" || reviewStatus === status

      return matchKeyword && matchStatus
    })
  }, [keyword, matrix, status])

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title={jobsheet ? `Detail Jobsheet ${jobsheet.title}` : "Detail Jobsheet"}
        subtitle={jobsheet ? `${jobsheet.programmingLanguageDisplayName} - Status: ${jobsheet.status}` : undefined}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!jobsheet ? (
        <LecturerEmptyState title="Jobsheet tidak ditemukan." />
      ) : (
        <>
          <TabButton tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <LecturerPanel className="rounded-t-none p-5">
            {activeTab === "detail" && (
              <div className="space-y-5">
                <LecturerPanel className="p-5">
                  <h2 className="text-lg font-semibold">Informasi Umum</h2>
                  <p className="mt-3 text-sm text-gray-700">Judul Jobsheet: {jobsheet.title}</p>
                  <p className="text-sm text-gray-700">Deadline: {jobsheet.deadline || "-"}</p>
                  <p className="text-sm text-gray-700">Deskripsi: {jobsheet.description || "-"}</p>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Tujuan Praktikum</h2>
                  <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                    {jobsheet.goal || "Belum ada tujuan praktikum."}
                  </p>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Dasar Teori</h2>
                  {jobsheet.theory.length ? (
                    <div className="space-y-4">
                      {jobsheet.theory.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-2 font-semibold">{item.title}</p>
                          <RichTextViewer content={item.content} role="DOSEN" mode="viewer-default" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada dasar teori.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Percobaan Praktikum</h2>
                  {jobsheet.experiments.length ? (
                    <div className="space-y-4">
                      {jobsheet.experiments.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-blue-50 p-4 text-sm text-gray-700">
                          <p className="font-semibold">
                            Percobaan {item.order}: {item.title}{" "}
                            <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                              (Bobot: {item.rubric ?? 0}%)
                            </span>
                          </p>
                          <div className="mt-3">
                            <RichTextViewer content={item.instructionContent ?? { type: "doc", content: [] }} role="DOSEN" mode="viewer-default" />
                          </div>
                          {item.defaultTemplateCode && (
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
                              <code>{item.defaultTemplateCode}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada percobaan praktikum.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Latihan Praktikum</h2>
                  {jobsheet.exercises.length ? (
                    <div className="space-y-4">
                      {jobsheet.exercises.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-blue-50 p-4 text-sm text-gray-700">
                          <p className="font-semibold">
                            Latihan {item.order}: {item.title}{" "}
                            <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                              (Bobot: {item.rubric ?? 0}%)
                            </span>
                          </p>
                          <div className="mt-3">
                            <RichTextViewer content={item.instructionContent ?? { type: "doc", content: [] }} role="DOSEN" mode="viewer-default" />
                          </div>
                          {item.defaultTemplateCode && (
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
                              <code>{item.defaultTemplateCode}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum ada latihan praktikum.</p>
                  )}
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Tugas Praktikum</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-800">Percobaan untuk laporan</p>
                      <div className="space-y-2 text-sm">
                        {jobsheet.experiments.map((item) => (
                          <label key={item.id} className="flex items-center gap-3">
                            <input type="checkbox" checked={item.isReported} readOnly />
                            <span>{item.title} ({item.rubric ?? 0}%)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-800">Latihan untuk laporan</p>
                      <div className="space-y-2 text-sm">
                        {jobsheet.exercises.map((item) => (
                          <label key={item.id} className="flex items-center gap-3">
                            <input type="checkbox" checked={item.isReported} readOnly />
                            <span>{item.title} ({item.rubric ?? 0}%)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <RichTextViewer
                      content={jobsheet.task.instructionContent ?? { type: "doc", content: [] }}
                      role="DOSEN"
                      mode="viewer-default"
                    />
                  </div>
                </LecturerPanel>

                <LecturerButton onClick={() => navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}/edit`)}>
                  Edit Jobsheet
                </LecturerButton>
              </div>
            )}

            {activeTab === "students" && (
              <div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <NativeSelect value={status} onChange={setStatus} label="Status">
                    <option value="all">Semua Status</option>
                    <option value="Terkumpul">Terkumpul</option>
                    <option value="Dinilai">Dinilai</option>
                    <option value="Revisi">Revisi</option>
                    <option value="Belum">Belum</option>
                  </NativeSelect>
                  <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
                </div>

                {!filteredStudents.length ? (
                  <LecturerEmptyState title="Belum ada data submission mahasiswa untuk jobsheet ini." />
                ) : (
                  <LecturerTable headers={["NIM", "Nama", "Status", "Nilai AI", "Nilai Akhir", "Aksi"]}>
                    {filteredStudents.map((item) => (
                      <tr key={item.student.id}>
                        <td className="px-4 py-3 font-mono">{item.student.nim}</td>
                        <td className="px-4 py-3">{item.student.fullname}</td>
                        <td className="px-4 py-3">{getSubmissionReviewStatus(item.submission)}</td>
                        <td className="px-4 py-3 text-center">{item.submission?.score ?? "-"}</td>
                        <td className="px-4 py-3 text-center">{item.submission?.review?.finalScore ?? "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:text-blue-900"
                            onClick={() => navigate(`/reviews/${item.student.id}?courseId=${courseId}&classId=${classId}&jobsheetId=${jobsheet.id}`)}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </LecturerTable>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <LecturerPanel className="p-5">
                  <h2 className="mb-3 text-lg font-semibold">Status Jobsheet</h2>
                  <p className="text-sm text-gray-700">Status saat ini: {jobsheet.status}</p>
                  <div className="mt-4">
                    <LecturerButton onClick={() => navigate(`/courses/${courseId}/jobsheets`)}>
                      Buka Pengaturan Publikasi
                    </LecturerButton>
                  </div>
                </LecturerPanel>

                <LecturerPanel className="p-5">
                  <h2 className="mb-4 text-lg font-semibold">Konfigurasi Penilaian</h2>
                  <p className="text-sm text-gray-600">
                    Kesimpulan akhir: {jobsheet.task.conclusionConfig?.required ? "Wajib" : "Opsional"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Minimal kata: {jobsheet.task.conclusionConfig?.minWord ?? 150}
                  </p>
                  <p className="text-sm text-gray-600">
                    Pernyataan mandiri: {jobsheet.task.requireSelfDeclaration ? "Aktif" : "Tidak aktif"}
                  </p>
                </LecturerPanel>
              </div>
            )}
          </LecturerPanel>
        </>
      )}
    </LecturerLayout>
  )
}
