import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import type { JSONContent } from "@tiptap/react"
import { ArrowLeft } from "lucide-react"
import RichTextEditor from "../../../components/editor/RichTextEditor"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import type { Jobsheet } from "../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../services/submission/types"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerEmptyState, LecturerModal, LecturerPanel, PageHeader } from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerJobsheetById,
  getLecturerSubmission,
  saveLecturerSubmissionReview,
  getSubmissionReviewStatus,
} from "../service"

const emptyDoc = { type: "doc" as const, content: [] }

function extractTextContent(node: JSONContent | JSONContent[] | string | undefined): string {
  if (!node) return ""
  if (typeof node === "string") return node
  if (Array.isArray(node)) return node.map(extractTextContent).join("")
  return [node.text ?? "", ...(node.content ?? []).map(extractTextContent)].join("")
}

export default function LecturerReviewPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { studentId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId") ?? ""
  const jobsheetId = searchParams.get("jobsheetId") ?? ""
  const classId = searchParams.get("classId") ?? ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [score, setScore] = useState("")
  const [decision, setDecision] = useState("")
  const [lecturerNote, setLecturerNote] = useState<JSONContent>(emptyDoc)
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [student, setStudent] = useState<{ fullname: string; nim: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [successDecision, setSuccessDecision] = useState<"ACCEPTED" | "REVISION" | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!studentId || !courseId || !jobsheetId) {
        setLoading(false)
        setError("Context review belum lengkap.")
        return
      }

      setLoading(true)
      setError("")
      setSuccessMessage("")

      try {
        const [selectedJobsheet, selectedSubmission] = await Promise.all([
          getLecturerJobsheetById(courseId, jobsheetId),
          getLecturerSubmission(courseId, jobsheetId, studentId),
        ])

        setJobsheet(selectedJobsheet)
        setSubmission(selectedSubmission)
        setScore(String(selectedSubmission?.review?.finalScore ?? ""))
        setDecision(selectedSubmission?.review?.decision ?? "")
        setLecturerNote(
          selectedSubmission?.review?.lecturerFeedback
            ? {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: selectedSubmission.review.lecturerFeedback }],
                  },
                ],
              }
            : emptyDoc,
        )

        if (classId) {
          const classDetail = await getLecturerClassDetail(classId)
          const selectedStudent = classDetail.students.find((item) => item.id === studentId) ?? null
          setStudent(
            selectedStudent
              ? { fullname: selectedStudent.fullname, nim: selectedStudent.nim }
              : null,
          )
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat halaman review dosen.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId, courseId, jobsheetId, studentId])

  const experimentReports = useMemo(() => {
    if (!jobsheet || !submission) return []

    return jobsheet.experiments.map((experiment) => {
      const report = submission.report.experiments?.[experiment.id]
      return {
        experiment,
        steps: report?.steps ?? [],
      }
    })
  }, [jobsheet, submission])

  const exerciseReports = useMemo(() => {
    if (!jobsheet || !submission) return []

    return jobsheet.exercises.map((exercise) => ({
      exercise,
      report: submission.report.exercises?.[exercise.id] ?? null,
    }))
  }, [jobsheet, submission])

  if (loading) {
    return <TopProgressBar />
  }

  async function handleSaveReview(nextDecision: "ACCEPTED" | "REVISION") {
    if (!user || !submission) return

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      await saveLecturerSubmissionReview(submission.id, {
        lecturerId: user.id,
        aiScore: submission.score,
        finalScore: score ? Number(score) : undefined,
        feedback: extractTextContent(lecturerNote).trim(),
        decision: nextDecision,
        aiFeedback: {
          comments: submission.review?.comments ?? [],
        },
      })

      const refreshedSubmission = await getLecturerSubmission(courseId, jobsheetId, studentId)
      setSubmission(refreshedSubmission)
      setDecision(nextDecision)
      setSuccessDecision(nextDecision)
      setSuccessMessage(
        nextDecision === "ACCEPTED"
          ? "Review berhasil disimpan dan submission diterima."
          : "Review berhasil disimpan dan mahasiswa diminta revisi.",
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan review dosen.")
    } finally {
      setSaving(false)
    }
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
        title="Review Laporan Praktikum"
        subtitle={jobsheet ? `${jobsheet.title} - ${getSubmissionReviewStatus(submission)}` : undefined}
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

      {!jobsheet || !submission ? (
        <LecturerEmptyState title="Submission mahasiswa belum tersedia untuk direview." />
      ) : (
        <>
          {decision && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Keputusan saat ini: {decision}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <LecturerPanel className="p-5">
              <section className="border-b border-gray-200 pb-5">
                <h2 className="mb-4 text-lg font-semibold">Identitas Mahasiswa</h2>
                <dl className="grid gap-3 text-sm md:grid-cols-[160px_1fr]">
                  <dt className="text-gray-600">Nama</dt><dd>{student?.fullname ?? "-"}</dd>
                  <dt className="text-gray-600">NIM</dt><dd>{student?.nim ?? "-"}</dd>
                  <dt className="text-gray-600">Materi</dt><dd>{jobsheet.title}</dd>
                  <dt className="text-gray-600">Status</dt><dd>{getSubmissionReviewStatus(submission)}</dd>
                  <dt className="text-gray-600">Diperbarui</dt><dd>{new Date(submission.updatedAt).toLocaleString("id-ID")}</dd>
                </dl>
              </section>

              <section className="py-5">
                <h2 className="mb-4 text-lg font-semibold">Percobaan</h2>
                {!experimentReports.length ? (
                  <p className="text-sm text-gray-500">Tidak ada percobaan pada jobsheet ini.</p>
                ) : (
                  experimentReports.map(({ experiment, steps }) => (
                    <div key={experiment.id} className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-semibold">
                        Percobaan {experiment.order}: {experiment.title}
                      </p>
                      {!steps.length ? (
                        <p className="text-sm text-gray-500">Mahasiswa belum mengisi percobaan ini.</p>
                      ) : (
                        steps.map((step, index) => (
                          <div key={`${experiment.id}-${index}`} className="mb-4 rounded-md bg-white p-4 text-sm">
                            <p className="font-semibold">Langkah {index + 1}</p>
                            <pre className="mt-3 overflow-x-auto rounded-md bg-gray-950 p-4 text-xs text-gray-100">
                              <code>
                                {Object.entries(step.files ?? {})
                                  .map(([name, content]) => `// ${name}\n${content}`)
                                  .join("\n\n") || "// Belum ada kode"}
                              </code>
                            </pre>
                            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                              <p className="font-semibold">Output:</p>
                              <p className="mt-1 whitespace-pre-line">{step.output || "-"}</p>
                            </div>
                            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                              <p className="mb-2 font-semibold">Analisis:</p>
                              <RichTextViewer content={step.analysis ?? emptyDoc} role="DOSEN" mode="viewer-default" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}
              </section>

              <section className="border-t border-gray-200 py-5">
                <h2 className="mb-4 text-lg font-semibold">Latihan</h2>
                {!exerciseReports.length ? (
                  <p className="text-sm text-gray-500">Tidak ada latihan pada jobsheet ini.</p>
                ) : (
                  exerciseReports.map(({ exercise, report }) => (
                    <div key={exercise.id} className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-semibold">
                        Latihan {exercise.order}: {exercise.title}
                      </p>
                      {!report ? (
                        <p className="text-sm text-gray-500">Mahasiswa belum mengisi latihan ini.</p>
                      ) : (
                        <>
                          <pre className="overflow-x-auto rounded-md bg-gray-950 p-4 text-xs text-gray-100">
                            <code>
                              {Object.entries(report.files ?? {})
                                .map(([name, content]) => `// ${name}\n${content}`)
                                .join("\n\n") || "// Belum ada kode"}
                            </code>
                          </pre>
                          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="font-semibold">Output:</p>
                            <p className="mt-1 whitespace-pre-line">{report.output || "-"}</p>
                          </div>
                          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="mb-2 font-semibold">Analisis:</p>
                            <RichTextViewer content={report.analysis ?? emptyDoc} role="DOSEN" mode="viewer-default" />
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </section>

              <section className="border-t border-gray-200 pt-5">
                <h2 className="mb-3 text-lg font-semibold">Kesimpulan Akhir</h2>
                <div className="rounded-md bg-gray-50 p-4 text-sm">
                  {submission.conclusion?.content ? (
                    <RichTextViewer content={submission.conclusion.content} role="DOSEN" mode="viewer-default" />
                  ) : (
                    <p className="text-gray-500">Mahasiswa belum menulis kesimpulan akhir.</p>
                  )}
                </div>
              </section>
            </LecturerPanel>

            <aside className="space-y-5">
              <LecturerPanel className="p-5">
                <h2 className="mb-4 text-lg font-semibold">Ringkasan Review</h2>
                <div className="space-y-3 text-sm">
                  <p>Status submission: {getSubmissionReviewStatus(submission)}</p>
                  <p>Nilai AI: {submission.score ?? "-"}</p>
                  <p>Nilai akhir backend: {submission.review?.finalScore ?? "-"}</p>
                  <p>Jumlah komentar backend: {submission.review?.comments.length ?? 0}</p>
                </div>
              </LecturerPanel>

              <LecturerPanel className="p-5">
                <h2 className="mb-4 text-lg font-semibold">Penilaian & Keputusan</h2>
                <label className="mb-3 block text-sm font-medium">
                  Nilai AI
                  <input className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3" value={submission.score ?? ""} readOnly />
                </label>
                <label className="mb-3 block text-sm font-medium">
                  Nilai Akhir
                  <input className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3" value={score} onChange={(event) => setScore(event.target.value)} />
                </label>
                <label className="block text-sm font-medium">
                  Catatan Dosen
                  <div className="mt-2">
                    <RichTextEditor
                      value={lecturerNote}
                      onChange={setLecturerNote}
                      role="DOSEN"
                      placeholder="Tulis catatan review dosen dengan format lengkap..."
                    />
                  </div>
                </label>
                <div className="mt-5 flex gap-3">
                  <LecturerButton
                    variant="secondary"
                    className="flex-1"
                    disabled={saving}
                    onClick={() => handleSaveReview("REVISION")}
                  >
                    {saving ? "Menyimpan..." : "Tolak & Revisi"}
                  </LecturerButton>
                  <LecturerButton
                    className="flex-1"
                    disabled={saving}
                    onClick={() => handleSaveReview("ACCEPTED")}
                  >
                    {saving ? "Menyimpan..." : "Terima"}
                  </LecturerButton>
                </div>
                <LecturerButton variant="ghost" className="mt-3 w-full" onClick={() => navigate(-1)}>
                  Kembali
                </LecturerButton>
              </LecturerPanel>
            </aside>
          </div>
        </>
      )}

      {successDecision && (
        <LecturerModal
          title="Penilaian Berhasil"
          onClose={() => setSuccessDecision(null)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setSuccessDecision(null)}>
                Tetap di Halaman Ini
              </LecturerButton>
              <LecturerButton
                onClick={() => {
                  setSuccessDecision(null)
                  navigate(-1)
                }}
              >
                Kembali ke Daftar
              </LecturerButton>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            {successDecision === "ACCEPTED"
              ? "Jobsheet sudah berhasil dinilai dan diterima."
              : "Jobsheet sudah berhasil dinilai dan dikembalikan untuk revisi."}
          </p>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
