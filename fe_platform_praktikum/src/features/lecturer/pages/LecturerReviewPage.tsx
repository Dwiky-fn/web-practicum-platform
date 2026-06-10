import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
const emptyDoc = { type: "doc" as const, content: [] }
import { ArrowLeft, Eye, Edit } from "lucide-react"
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
import {
  getFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  publishFeedback,
  publishMultipleFeedbacks,
} from "../../../services/reviewFeedbackService"
import type { ReviewFeedback } from "../../../services/reviewFeedbackService"
import type { SelectedLineRange } from "../components/review/CodeReviewBlock"
import ExperimentReviewCard from "../components/review/ExperimentReviewCard"

import ReviewSidePanel from "../components/review/ReviewSidePanel"



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
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [student, setStudent] = useState<{ fullname: string; nim: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [successDecision, setSuccessDecision] = useState<"ACCEPTED" | null>(null)

  // Review feedbacks states
  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
  const [selectedLineRange, setSelectedLineRange] = useState<SelectedLineRange | null>(null)
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"percobaan" | "jobsheet">("percobaan")
  const [isEditingReview, setIsEditingReview] = useState(false)

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

        if (classId) {
          const classDetail = await getLecturerClassDetail(classId)
          const selectedStudent = classDetail.students.find((item) => item.id === studentId) ?? null
          setStudent(
            selectedStudent
              ? { fullname: selectedStudent.fullname, nim: selectedStudent.nim }
              : null,
          )
        }

        if (selectedSubmission) {
          const reviewFeedbacks = await getFeedbacks(selectedSubmission.id)
          setFeedbacks(reviewFeedbacks)
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

  const handleCreateFeedback = async (payload: any) => {
    const created = await createFeedback(payload)
    setFeedbacks((prev) => [...prev, created])
    return created
  }

  const handleUpdateFeedback = async (id: string, payload: any) => {
    const updated = await updateFeedback(id, payload)
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? updated : f)))
    return updated
  }

  const handleDeleteFeedback = async (id: string) => {
    await deleteFeedback(id)
    setFeedbacks((prev) => prev.filter((f) => f.id !== id))
    if (activeFeedbackId === id) {
      setActiveFeedbackId(null)
    }
  }

  const handlePublishFeedback = async (id: string) => {
    const published = await publishFeedback(id)
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? published : f)))
    return published
  }

  const handlePublishMultipleFeedbacks = async (ids: string[]) => {
    await publishMultipleFeedbacks(ids)
    setFeedbacks((prev) =>
      prev.map((f) =>
        ids.includes(f.id)
          ? { ...f, status: "published" as const, publishedAt: new Date().toISOString() }
          : f
      )
    )
  }



  async function handleSaveReview(nextDecision: "ACCEPTED") {
    if (!user || !submission) return

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      await saveLecturerSubmissionReview(submission.id, {
        lecturerId: user.id,
        aiScore: submission.score,
        finalScore: score ? Number(score) : undefined,
        feedback: "",
        decision: nextDecision,
        aiFeedback: {
          comments: submission.review?.comments ?? [],
        },
      })

      const refreshedSubmission = await getLecturerSubmission(courseId, jobsheetId, studentId)
      setSubmission(refreshedSubmission)
      setSuccessDecision(nextDecision)
      setSuccessMessage("Review berhasil disimpan dan submission diterima.")
      setIsEditingReview(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan review dosen.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <TopProgressBar />
  }

  const isDraft = submission?.status === "DRAFT"
  const isReviewed = submission?.status === "ACCEPTED"
  const isReadOnly = isDraft || (isReviewed && !isEditingReview)

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
          {/* Warning Banner if submission is reviewed */}
          {isReviewed && (
            <div className={`mb-6 rounded-xl border px-5 py-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm font-sans ${
              isEditingReview 
                ? "border-amber-200 bg-amber-50 text-amber-800" 
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {isEditingReview ? (
                    <Edit className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  {isEditingReview ? (
                    <>
                      <span className="font-bold">Mode Edit Penilaian Aktif:</span> Anda sedang mengubah penilaian dan feedback untuk laporan ini. Klik <span className="font-semibold">Simpan & Publish Penilaian</span> di panel sebelah kanan (tab Jobsheet) setelah selesai.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Laporan Sudah Dinilai:</span> Hasil review saat ini terkunci (read-only). Klik tombol di sebelah kanan jika ingin memperbarui penilaian.
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingReview(prev => !prev)}
                className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-lg border shadow-sm transition-all ${
                  isEditingReview
                    ? "bg-white border-amber-300 text-amber-700 hover:bg-amber-100/50"
                    : "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                }`}
              >
                {isEditingReview ? "Batal Edit" : "Edit Penilaian"}
              </button>
            </div>
          )}

          {/* Warning Banner if submission is draft */}
          {isDraft && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 flex items-center gap-3 shadow-sm font-sans">
              <div className="text-xl shrink-0">⚠️</div>
              <div>
                <span className="font-bold">Laporan Belum Dikumpulkan:</span> Mahasiswa belum menyelesaikan jobsheet ini (status submission masih DRAFT). Anda hanya dapat memantau pengerjaan laporan dan belum bisa melakukan review atau memberikan penilaian.
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
            <div className="space-y-6">
              {/* Identitas Mahasiswa Panel */}
              <LecturerPanel className="p-5">
                <h2 className="mb-4 text-lg font-semibold border-b border-gray-100 pb-2">Identitas Mahasiswa</h2>
                <dl className="grid gap-3 text-sm md:grid-cols-[160px_1fr]">
                  <dt className="text-gray-600 font-medium">Nama</dt>
                  <dd className="text-gray-900">{student?.fullname ?? "-"}</dd>
                  <dt className="text-gray-600 font-medium">NIM</dt>
                  <dd className="text-gray-900">{student?.nim ?? "-"}</dd>
                  <dt className="text-gray-600 font-medium">Materi</dt>
                  <dd className="text-gray-900">{jobsheet.title}</dd>
                  <dt className="text-gray-600 font-medium">Status</dt>
                  <dd className="text-gray-900">{getSubmissionReviewStatus(submission)}</dd>
                  <dt className="text-gray-600 font-medium font-sans">Diperbarui</dt>
                  <dd className="text-gray-900">{new Date(submission.updatedAt).toLocaleString("id-ID")}</dd>
                </dl>
              </LecturerPanel>

              {/* Collapsible Experiments review list */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Percobaan Laporan</h2>
                {!experimentReports.length ? (
                  <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-center italic">
                    Tidak ada percobaan pada jobsheet ini.
                  </p>
                ) : (
                  experimentReports.map(({ experiment, steps }) => (
                    <ExperimentReviewCard
                      key={experiment.id}
                      submissionId={submission.id}
                      experiment={experiment}
                      steps={steps}
                      feedbacks={feedbacks}
                      readOnly={isReadOnly}
                      selectedLineRange={isReadOnly ? null : selectedLineRange}
                      activeFeedbackId={activeFeedbackId}
                      onSelectLines={isReadOnly ? undefined : setSelectedLineRange}
                      onSelectFeedback={setActiveFeedbackId}
                      onClearSelection={() => setSelectedLineRange(null)}
                      onOpenFeedbackEditor={(expId) => {
                        if (isReadOnly) return
                        setActiveExperimentId(expId)
                        setActiveTab("percobaan")
                      }}
                      isExpandedByDefault={true}
                    />
                  ))
                )}
              </div>

              {/* Latihan Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Latihan Laporan</h2>
                {!exerciseReports.length ? (
                  <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-center italic">
                    Tidak ada latihan pada jobsheet ini.
                  </p>
                ) : (
                  exerciseReports.map(({ exercise, report }) => {
                    const exerciseSteps = report
                      ? [
                          {
                            files: report.files ?? {},
                            output: report.output || "",
                            analysis: report.analysis ?? emptyDoc,
                          },
                        ]
                      : []
                    return (
                      <ExperimentReviewCard
                        key={exercise.id}
                        submissionId={submission.id}
                        experiment={{
                          id: exercise.id,
                          title: exercise.title,
                          order: exercise.order,
                          instructionContent: exercise.instructionContent,
                        }}
                        steps={exerciseSteps}
                        feedbacks={feedbacks}
                        readOnly={isReadOnly}
                        selectedLineRange={isReadOnly ? null : selectedLineRange}
                        activeFeedbackId={activeFeedbackId}
                        onSelectLines={isReadOnly ? undefined : setSelectedLineRange}
                        onSelectFeedback={setActiveFeedbackId}
                        onClearSelection={() => setSelectedLineRange(null)}
                        onOpenFeedbackEditor={(exeId) => {
                          if (isReadOnly) return
                          setActiveExperimentId(exeId)
                          setActiveTab("percobaan")
                        }}
                        isExpandedByDefault={true}
                        type="exercise"
                      />
                    )
                  })
                )}
              </div>

              {/* Kesimpulan Akhir */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Kesimpulan Akhir</h2>
                <div className="rounded-lg bg-gray-50 p-4 text-sm border">
                  {submission.conclusion?.content ? (
                    <RichTextViewer content={submission.conclusion.content} role="MAHASISWA" mode="viewer-default" />
                  ) : (
                    <p className="text-gray-500 italic">Mahasiswa belum menulis kesimpulan akhir.</p>
                  )}
                </div>
              </div>


            </div>

            {/* Tabbed Sticky Reviews Panel / Draft Mode Placeholder */}
            <aside className="sticky top-6">
              {isDraft ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 font-sans">
                  <h3 className="font-bold text-gray-800 text-sm">Status Submission</h3>
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 rounded-lg text-center uppercase tracking-wide">
                    DRAFT (Belum Selesai)
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Mahasiswa masih pengerjaan jobsheet ini. Anda hanya dapat memantau progres pengerjaan laporan secara real-time. Fitur penilaian, input nilai, dan feedback akan terbuka secara otomatis setelah laporan berhasil dikumpulkan oleh mahasiswa.
                  </p>
                </div>
              ) : (
                <ReviewSidePanel
                  submissionId={submission.id}
                  experiments={jobsheet.experiments}
                  exercises={jobsheet.exercises}
                  feedbacks={feedbacks}
                  activeFeedbackId={activeFeedbackId}
                  onSelectFeedback={setActiveFeedbackId}
                  selectedLineRange={selectedLineRange}
                  onClearSelection={() => setSelectedLineRange(null)}
                  onCreateFeedback={handleCreateFeedback}
                  onUpdateFeedback={handleUpdateFeedback}
                  onDeleteFeedback={handleDeleteFeedback}
                  onPublishFeedback={handlePublishFeedback}
                  onPublishMultipleFeedbacks={handlePublishMultipleFeedbacks}

                  activeExperimentId={activeExperimentId}
                  onSetActiveExperimentId={setActiveExperimentId}
                  score={score}
                  onScoreChange={setScore}
                  saving={saving}
                  onSaveReview={handleSaveReview}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  readOnly={isReadOnly}
                  aiScore={submission.score}
                />
              )}
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
            Jobsheet sudah berhasil dinilai dan disimpan.
          </p>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
