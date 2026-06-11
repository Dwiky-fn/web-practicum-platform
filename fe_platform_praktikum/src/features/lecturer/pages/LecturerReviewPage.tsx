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
  triggerAiReview,
} from "../service"
import {
  getFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  publishFeedback,
  publishMultipleFeedbacks,
  getStoredFeedbacks,
  saveStoredFeedbacks,
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
  const [activeTab, setActiveTab] = useState<"percobaan" | "komentar_kode" | "jobsheet">("percobaan")
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [triggeringAi, setTriggeringAi] = useState(false)

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
          let reviewFeedbacks = await getFeedbacks(selectedSubmission.id)
          
          if (reviewFeedbacks.length === 0 && selectedSubmission.review?.aiFeedback?.feedbacks) {
            reviewFeedbacks = selectedSubmission.review.aiFeedback.feedbacks;
            const all = getStoredFeedbacks();
            const filteredAll = all.filter((f) => f.submissionId !== selectedSubmission.id);
            saveStoredFeedbacks([...filteredAll, ...reviewFeedbacks]);
          } else if (reviewFeedbacks.length === 0 && selectedSubmission.review?.aiFeedback) {
            const ai = selectedSubmission.review.aiFeedback;
            const initialFeedbacks: ReviewFeedback[] = [];
            
            if (ai.jobsheetFeedback) {
              initialFeedbacks.push({
                id: `ai-jobsheet-${selectedSubmission.id}`,
                submissionId: selectedSubmission.id,
                scope: "jobsheet" as const,
                content: ai.jobsheetFeedback.summary || "",
                strengths: ai.jobsheetFeedback.strengths || [],
                issues: ai.jobsheetFeedback.issues || [],
                suggestions: ai.jobsheetFeedback.learningSuggestions || [],
                source: "ai" as const,
                status: "draft" as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
            
            if (Array.isArray(ai.experimentResults)) {
              ai.experimentResults.forEach((res: any) => {
                if (res.status !== "failed") {
                  initialFeedbacks.push({
                    id: `ai-experiment-${res.experimentId}`,
                    submissionId: selectedSubmission.id,
                    experimentId: res.experimentId,
                    scope: "experiment" as const,
                    content: res.summary || "",
                    strengths: res.strengths || [],
                    issues: res.issues || [],
                    suggestions: res.suggestions || [],
                    source: "ai" as const,
                    status: "draft" as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                }
              });
            }
            
            if (Array.isArray(ai.codeFeedbacks)) {
              ai.codeFeedbacks.forEach((fb: any, index: number) => {
                initialFeedbacks.push({
                  id: `ai-code-${fb.experimentId}-${index}`,
                  submissionId: selectedSubmission.id,
                  experimentId: fb.experimentId,
                  codeBlockId: `code-${fb.experimentId}`,
                  fileName: fb.filePath,
                  scope: "code" as const,
                  startLine: fb.startLine,
                  endLine: fb.endLine,
                  selectedCode: fb.selectedCode || "",
                  content: `${fb.message}\nSaran: ${fb.suggestion}`,
                  source: "ai" as const,
                  status: "draft" as const,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              });
            }
            
            if (initialFeedbacks.length > 0) {
              reviewFeedbacks = initialFeedbacks;
              const all = getStoredFeedbacks();
              const filteredAll = all.filter((f) => f.submissionId !== selectedSubmission.id);
              saveStoredFeedbacks([...filteredAll, ...reviewFeedbacks]);
            }
          }
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

  async function handleTriggerAiReview() {
    if (!submission) return
    try {
      setTriggeringAi(true)
      setError("")
      await triggerAiReview(submission.id)
      setSubmission((prev) =>
        prev
          ? {
              ...prev,
              aiEvaluationStatus: "queued",
              aiEvaluationError: undefined,
            }
          : null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menjalankan review AI.")
    } finally {
      setTriggeringAi(false)
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (
      submission &&
      (submission.aiEvaluationStatus === "queued" ||
        submission.aiEvaluationStatus === "processing")
    ) {
      intervalId = setInterval(async () => {
        try {
          const refreshedSubmission = await getLecturerSubmission(courseId, jobsheetId, studentId)
          if (refreshedSubmission) {
            setSubmission(refreshedSubmission)

            if (
              refreshedSubmission.aiEvaluationStatus === "completed" ||
              refreshedSubmission.aiEvaluationStatus === "partially_failed"
            ) {
              // Clear local feedbacks for this submission so we load the new AI ones
              const all = getStoredFeedbacks()
              const filtered = all.filter((f) => f.submissionId !== refreshedSubmission.id)
              saveStoredFeedbacks(filtered)

              // Load the feedbacks
              let reviewFeedbacks = await getFeedbacks(refreshedSubmission.id)
              if (reviewFeedbacks.length === 0 && refreshedSubmission.review?.aiFeedback?.feedbacks) {
                reviewFeedbacks = refreshedSubmission.review.aiFeedback.feedbacks
                saveStoredFeedbacks([...filtered, ...reviewFeedbacks])
              } else if (reviewFeedbacks.length === 0 && refreshedSubmission.review?.aiFeedback) {
                const ai = refreshedSubmission.review.aiFeedback
                const initialFeedbacks: ReviewFeedback[] = []

                if (ai.jobsheetFeedback) {
                  initialFeedbacks.push({
                    id: `ai-jobsheet-${refreshedSubmission.id}`,
                    submissionId: refreshedSubmission.id,
                    scope: "jobsheet" as const,
                    content: ai.jobsheetFeedback.summary || "",
                    strengths: ai.jobsheetFeedback.strengths || [],
                    issues: ai.jobsheetFeedback.issues || [],
                    suggestions: ai.jobsheetFeedback.learningSuggestions || [],
                    source: "ai" as const,
                    status: "draft" as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }

                if (Array.isArray(ai.experimentResults)) {
                  ai.experimentResults.forEach((res: any) => {
                    if (res.status !== "failed") {
                      initialFeedbacks.push({
                        id: `ai-experiment-${res.experimentId}`,
                        submissionId: refreshedSubmission.id,
                        experimentId: res.experimentId,
                        scope: "experiment" as const,
                        content: res.summary || "",
                        strengths: res.strengths || [],
                        issues: res.issues || [],
                        suggestions: res.suggestions || [],
                        source: "ai" as const,
                        status: "draft" as const,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  })
                }

                if (Array.isArray(ai.codeFeedbacks)) {
                  ai.codeFeedbacks.forEach((fb: any, index: number) => {
                    initialFeedbacks.push({
                      id: `ai-code-${fb.experimentId}-${index}`,
                      submissionId: refreshedSubmission.id,
                      experimentId: fb.experimentId,
                      codeBlockId: `code-${fb.experimentId}`,
                      fileName: fb.filePath,
                      scope: "code" as const,
                      startLine: fb.startLine,
                      endLine: fb.endLine,
                      selectedCode: fb.selectedCode || "",
                      content: `${fb.message}\nSaran: ${fb.suggestion}`,
                      source: "ai" as const,
                      status: "draft" as const,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  })
                }

                if (initialFeedbacks.length > 0) {
                  reviewFeedbacks = initialFeedbacks
                  saveStoredFeedbacks([...filtered, ...reviewFeedbacks])
                }
              }
              setFeedbacks(reviewFeedbacks)
            }
          }
        } catch (err) {
          console.error("Failed to poll AI evaluation status:", err)
        }
      }, 2500)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [submission?.aiEvaluationStatus, courseId, jobsheetId, studentId])

  useEffect(() => {
    if (activeFeedbackId) {
      const fb = feedbacks.find((f) => f.id === activeFeedbackId)
      if (
        fb &&
        fb.scope === "code" &&
        fb.experimentId &&
        fb.fileName &&
        fb.startLine
      ) {
        // Wait a bit to allow the experiment card to expand if collapsed
        setTimeout(() => {
          let el = null
          
          // 1. Try exact match with feedback's codeBlockId if present
          if (fb.codeBlockId) {
            el = document.getElementById(
              `code-line-${fb.experimentId}-${fb.codeBlockId}-${fb.fileName}-${fb.startLine}`
            )
          }
          
          // 2. Try typical step indices (step-0, step-1, step-2, etc.)
          if (!el) {
            for (let i = 0; i < 10; i++) {
              el = document.getElementById(
                `code-line-${fb.experimentId}-step-${i}-${fb.fileName}-${fb.startLine}`
              )
              if (el) break
            }
          }
          
          // 3. Try fallback to AI format codeBlockId
          if (!el) {
            el = document.getElementById(
              `code-line-${fb.experimentId}-code-${fb.experimentId}-${fb.fileName}-${fb.startLine}`
            )
          }

          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          } else {
            console.warn(`[Scroll-to-Code] Baris kode tidak ditemukan untuk feedback:`, fb)
          }
        }, 150)
      }
    }
  }, [activeFeedbackId, feedbacks])

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

    const jobsheetFeedback = feedbacks.find(f => f.scope === "jobsheet")
    const lecturerFeedbackText = jobsheetFeedback ? jobsheetFeedback.content : ""

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      await saveLecturerSubmissionReview(submission.id, {
        lecturerId: user.id,
        aiScore: submission.score !== undefined && submission.score !== null ? Math.min(100, Math.max(0, submission.score)) : undefined,
        finalScore: score ? Math.min(100, Math.max(0, Number(score))) : undefined,
        feedback: lecturerFeedbackText,
        decision: nextDecision,
        aiFeedback: {
          feedbacks: feedbacks,
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

              {/* AI Review Assistant Panel */}
              {submission && submission.status !== "DRAFT" && (
                <LecturerPanel className="p-5 border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span className="text-xl">🤖</span> AI Review Assistant
                    </h2>
                  </div>

                  {/* Progress & Status */}
                  <div className="space-y-4">
                    {/* Status Display (Permanent) */}
                    <div className="bg-white/80 rounded-xl p-4 border border-gray-100 space-y-3 shadow-sm font-sans">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Review AI</div>
                      
                      {submission.aiEvaluationStatus === "none" && (
                        <div className="text-sm text-gray-600">Belum dievaluasi oleh AI.</div>
                      )}

                      {submission.aiEvaluationStatus === "queued" && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-amber-600 font-medium flex items-center gap-2">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Dalam Antrean...
                            </span>
                            <span className="text-xs text-gray-400">Menunggu antrean server</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full animate-pulse" style={{ width: "30%" }}></div>
                          </div>
                        </div>
                      )}

                      {submission.aiEvaluationStatus === "processing" && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-600 font-semibold flex items-center gap-2">
                              <svg className="animate-spin h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sedang Menganalisis Laporan...
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: "70%" }}></div>
                          </div>
                          <p className="text-[11px] text-gray-400 italic">Mencakup analisis kode program, output, dan analisis mahasiswa.</p>
                        </div>
                      )}

                      {submission.aiEvaluationStatus === "completed" && (
                        <div className="text-sm text-green-700 font-semibold flex items-center gap-1.5">
                          <span>✅</span> Review AI Selesai
                        </div>
                      )}

                      {submission.aiEvaluationStatus === "partially_failed" && (
                        <div className="text-sm text-amber-700 font-semibold flex items-center gap-1.5">
                          <span>⚠️</span> Selesai dengan Beberapa Error
                        </div>
                      )}

                      {submission.aiEvaluationStatus === "failed" && (
                        <div className="space-y-2">
                          <div className="text-sm text-red-700 font-semibold flex items-center gap-1.5">
                            <span>❌</span> Review AI Gagal
                          </div>
                          {submission.aiEvaluationError && (
                            <div className="text-[11px] bg-red-50 border border-red-100 rounded-lg p-2.5 text-red-600 font-mono overflow-auto max-h-20 leading-relaxed">
                              {submission.aiEvaluationError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Explanatory text & Trigger Button (Temporary) */}
                    <div className="space-y-3 pt-1">
                      {submission.aiEvaluationStatus === "completed" && (
                        <p className="text-xs text-gray-500 leading-relaxed font-sans">
                          Draft nilai & feedback dari AI telah dimasukkan ke panel penilaian di sebelah kanan. Anda dapat menyesuaikannya sebelum mempublish review.
                        </p>
                      )}
                      {submission.aiEvaluationStatus === "partially_failed" && (
                        <p className="text-xs text-gray-500 leading-relaxed font-sans">
                          Beberapa bagian gagal dievaluasi. Draft penilaian untuk bagian yang berhasil tetap dapat Anda akses di sebelah kanan.
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 font-sans">
                        <button
                          type="button"
                          onClick={handleTriggerAiReview}
                          disabled={triggeringAi || submission.aiEvaluationStatus === "queued" || submission.aiEvaluationStatus === "processing"}
                          className={`text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            submission.aiEvaluationStatus === "queued" || submission.aiEvaluationStatus === "processing"
                              ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                              : submission.aiEvaluationStatus === "completed" || submission.aiEvaluationStatus === "partially_failed"
                              ? "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {(triggeringAi || submission.aiEvaluationStatus === "queued" || submission.aiEvaluationStatus === "processing") ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {submission.aiEvaluationStatus === "queued" ? "Dalam Antrean AI..." : "Progres AI Mereview..."}
                            </>
                          ) : submission.aiEvaluationStatus === "completed" || submission.aiEvaluationStatus === "partially_failed" ? (
                            "Jalankan Ulang Review AI"
                          ) : (
                            "Mulai Review dengan AI"
                          )}
                        </button>
                        
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-1 rounded border border-amber-200 uppercase tracking-wider">
                          Fitur Sementara
                        </span>
                      </div>
                    </div>

                  </div>
                </LecturerPanel>
              )}

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
