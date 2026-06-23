import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useBackNavigation } from "../../../shared/utils/backNavigation";
const emptyDoc = { type: "doc" as const, content: [] }
import { ArrowLeft, Eye, Edit } from "lucide-react"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import type { Jobsheet } from "../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../services/submission/types"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerModal, LecturerPanel, PageHeader } from "../components/LecturerUI"
import {
  getLecturerClassDetail,
  getLecturerJobsheetById,
  getLecturerSubmission,
  saveLecturerSubmissionReview,
  getSubmissionReviewStatus,
  triggerAiReview,
  retryAiReview,
  deleteAiFeedback,
} from "../service"
import { apiFetch } from "../../../services/api"
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
import { toast } from "../../../components/toast/toastStore"

function isAiDerivedFeedback(item: ReviewFeedback) {
  return item.source === "ai" || item.source === "ai_edited_by_lecturer"
}

function hasAiFeedbackPayload(aiFeedback: any) {
  return Boolean(
    aiFeedback &&
      typeof aiFeedback === "object" &&
      Object.keys(aiFeedback).length > 0,
  )
}

function formatScore(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-"
  return Number(value).toFixed(2).replace(/\.?0+$/, "")
}

function scoreItemTypeLabel(type: "theory" | "experiment" | "exercise") {
  if (type === "theory") return "Dasar Teori"
  if (type === "experiment") return "Percobaan"
  return "Latihan"
}

async function removeAiDerivedFeedbacks(submissionId: string) {
  const current = await getFeedbacks(submissionId)
  const filtered = current.filter((item) => !isAiDerivedFeedback(item))
  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: filtered }),
  })
}

function parseAiFeedbackToFeedbacks(submissionId: string, aiFeedback: any): ReviewFeedback[] {
  const initialFeedbacks: ReviewFeedback[] = []
  if (!aiFeedback) return initialFeedbacks

  if (aiFeedback.jobsheetFeedback) {
    initialFeedbacks.push({
      id: `ai-jobsheet-${submissionId}`,
      submissionId,
      scope: "jobsheet" as const,
      content: aiFeedback.jobsheetFeedback.summary || "",
      strengths: aiFeedback.jobsheetFeedback.strengths || [],
      issues: aiFeedback.jobsheetFeedback.issues || [],
      suggestions: aiFeedback.jobsheetFeedback.learningSuggestions || [],
      source: "ai" as const,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  if (Array.isArray(aiFeedback.experimentResults)) {
    aiFeedback.experimentResults.forEach((res: any) => {
      if (res.status !== "failed") {
        initialFeedbacks.push({
          id: `ai-experiment-${res.experimentId}`,
          submissionId,
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

  if (Array.isArray(aiFeedback.codeFeedbacks)) {
    aiFeedback.codeFeedbacks.forEach((fb: any, index: number) => {
      initialFeedbacks.push({
        id: `ai-code-${fb.experimentId}-${index}`,
        submissionId,
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

  return initialFeedbacks
}



export default function LecturerReviewPage() {
  const navigate = useNavigate()
  const { handleBack: goBack } = useBackNavigation()
  const { user } = useCurrentUser()
  const { studentId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId") ?? ""
  const jobsheetId = searchParams.get("jobsheetId") ?? ""
  const classId = searchParams.get("classId") ?? ""
  const mataKuliahId = searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const submissionIdParam = searchParams.get("submissionId") || undefined
  const attemptNoParam = searchParams.get("attemptNo") ? Number(searchParams.get("attemptNo")) : undefined
  const attemptTypeRaw = searchParams.get("attemptType")
  const attemptTypeParam: "normal" | "remedial" | undefined =
    attemptTypeRaw === "remedial" ? "remedial" : attemptTypeRaw === "normal" ? "normal" : undefined
  const remedialIdParam = searchParams.get("remedialId") || undefined
  const nativeScope = {
    mataKuliahId,
    kelasPraktikumId,
    submissionId: submissionIdParam,
    attemptNo: attemptNoParam,
    attemptType: attemptTypeParam,
    remedialId: remedialIdParam,
  }

  const handleBack = useCallback(() => {
    const fromVal = searchParams.get("from")
    if (fromVal === "monitor" && kelasPraktikumId && jobsheetId && studentId) {
      const params = new URLSearchParams()
      if (courseId) params.set("courseId", courseId)
      if (classId) params.set("classId", classId)
      if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
      params.set("kelasPraktikumId", kelasPraktikumId)
      if (attemptTypeParam) params.set("attemptType", attemptTypeParam)
      if (remedialIdParam) params.set("remedialId", remedialIdParam)
      navigate(`/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor?${params.toString()}`)
    } else if (fromVal === "monitoring" && jobsheetId && classId && courseId) {
      const params = new URLSearchParams({ tab: "monitoring", classId, courseId })
      if (kelasPraktikumId) params.set("kelasPraktikumId", kelasPraktikumId)
      if (mataKuliahId) params.set("mataKuliahId", mataKuliahId)
      navigate(`/jobsheets/${jobsheetId}?${params.toString()}`)
    } else if (jobsheetId && classId && courseId) {
      const savedTab = sessionStorage.getItem(`activeTab_jobsheet_${jobsheetId}`) || "monitoring"
      navigate(`/jobsheets/${jobsheetId}?tab=${savedTab}&classId=${classId}&courseId=${courseId}`)
    } else {
        if (window.history.length > 1) {
          goBack({ parentPath: "/mata-kuliah", fallbackPath: "/mata-kuliah" });
        } else {
          navigate("/mata-kuliah");
        }
    }
  }, [searchParams, kelasPraktikumId, jobsheetId, studentId, courseId, classId, mataKuliahId, attemptTypeParam, remedialIdParam, navigate, goBack])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [score, setScore] = useState("")
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [student, setStudent] = useState<{ fullname: string; nim: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [successDecision, setSuccessDecision] = useState<"ACCEPTED" | null>(null)

  // Review feedbacks states
  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
  const [selectedLineRange, setSelectedLineRange] = useState<SelectedLineRange | null>(null)
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"percobaan" | "komentar_kode" | "jobsheet">("percobaan")
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [triggeringAi, setTriggeringAi] = useState(false)
  const [deletingAiFeedback, setDeletingAiFeedback] = useState(false)
  const [confirmDeleteAiFeedback, setConfirmDeleteAiFeedback] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!studentId || !courseId || !jobsheetId) {
        setLoading(false)
        setError("Data review tidak valid. Silakan kembali ke Monitoring Mahasiswa dan pilih mahasiswa kembali.")
        return
      }

      setLoading(true)
      setError("")

      try {
        const [selectedJobsheet, selectedSubmission] = await Promise.all([
          getLecturerJobsheetById(courseId, jobsheetId, nativeScope),
          getLecturerSubmission(courseId, jobsheetId, studentId, nativeScope),
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
          const hasAiFeedback = hasAiFeedbackPayload(selectedSubmission.review?.aiFeedback)

          if (!hasAiFeedback) {
            await removeAiDerivedFeedbacks(selectedSubmission.id)
            reviewFeedbacks = reviewFeedbacks.filter((item) => !isAiDerivedFeedback(item))
          }
          
          if (reviewFeedbacks.length === 0 && selectedSubmission.review?.aiFeedback?.feedbacks) {
            reviewFeedbacks = selectedSubmission.review.aiFeedback.feedbacks
            await apiFetch(`/submissions/${selectedSubmission.id}/feedbacks`, {
              method: "PUT",
              body: JSON.stringify({ feedbacks: reviewFeedbacks }),
            })
          } else if (reviewFeedbacks.length === 0 && selectedSubmission.review?.aiFeedback) {
            const initialFeedbacks = parseAiFeedbackToFeedbacks(selectedSubmission.id, selectedSubmission.review.aiFeedback)
            if (initialFeedbacks.length > 0) {
              reviewFeedbacks = initialFeedbacks
              await apiFetch(`/submissions/${selectedSubmission.id}/feedbacks`, {
                method: "PUT",
                body: JSON.stringify({ feedbacks: reviewFeedbacks }),
              })
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
  }, [classId, courseId, jobsheetId, kelasPraktikumId, mataKuliahId, studentId, submissionIdParam, attemptNoParam, attemptTypeParam, remedialIdParam])

  async function handleTriggerAiReview() {
    if (!submission) return
    const isRetry =
      submission.aiEvaluationStatus === "completed" ||
      submission.aiEvaluationStatus === "partially_failed" ||
      submission.aiEvaluationStatus === "failed"

    try {
      setTriggeringAi(true)
      setError("")
      if (isRetry) {
        await retryAiReview(submission.id)
      } else {
        await triggerAiReview(submission.id)
      }
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

  async function handleDeleteAiFeedback() {
    if (!submission) return

    try {
      setDeletingAiFeedback(true)
      setError("")

      await deleteAiFeedback(submission.id)

      removeAiDerivedFeedbacks(submission.id)

      setFeedbacks((prev) =>
        prev.filter((item) => !isAiDerivedFeedback(item)),
      )
      setSubmission((prev) =>
        prev
          ? {
              ...prev,
              score: undefined,
              review: prev.review
                ? {
                    ...prev.review,
                    aiFeedback: undefined,
                  }
                : prev.review,
            }
          : null,
      )
      setActiveFeedbackId(null)
      toast.success("Feedback AI berhasil dihapus. Data jobsheet dan task submission tidak diubah.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus feedback AI.")
    } finally {
      setDeletingAiFeedback(false)
      setConfirmDeleteAiFeedback(false)
    }
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    if (
      submission &&
      (submission.aiEvaluationStatus === "queued" ||
        submission.aiEvaluationStatus === "processing")
    ) {
      intervalId = setInterval(async () => {
        try {
          const refreshedSubmission = await getLecturerSubmission(courseId, jobsheetId, studentId, nativeScope)
          if (refreshedSubmission) {
            setSubmission(refreshedSubmission)

            if (
              refreshedSubmission.aiEvaluationStatus === "completed" ||
              refreshedSubmission.aiEvaluationStatus === "partially_failed"
            ) {
              // Parse the new AI feedbacks from the refreshed submission
              let newFbs: ReviewFeedback[] = []
              const hasAiFeedback = hasAiFeedbackPayload(refreshedSubmission.review?.aiFeedback)
              if (hasAiFeedback && refreshedSubmission.review) {
                if (Array.isArray(refreshedSubmission.review.aiFeedback?.feedbacks)) {
                  newFbs = refreshedSubmission.review.aiFeedback.feedbacks
                } else {
                  newFbs = parseAiFeedbackToFeedbacks(refreshedSubmission.id, refreshedSubmission.review.aiFeedback)
                }
              }

              // Overwrite database feedbacks list with the new AI feedbacks
              if (newFbs.length > 0) {
                await apiFetch(`/submissions/${refreshedSubmission.id}/feedbacks`, {
                  method: "PUT",
                  body: JSON.stringify({ feedbacks: newFbs }),
                })
              } else {
                await removeAiDerivedFeedbacks(refreshedSubmission.id)
              }

              // Load the feedbacks from database
              const reviewFeedbacks = await getFeedbacks(refreshedSubmission.id)
              setFeedbacks(reviewFeedbacks)
            }
          }
        } catch (err) {
          // Gagal memantau status evaluasi AI (silent fallback)
        }
      }, 2500)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [submission?.aiEvaluationStatus, courseId, jobsheetId, kelasPraktikumId, mataKuliahId, studentId])

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
    if (!submission) return
    const updated = await updateFeedback(submission.id, id, payload)
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? updated : f)))
    return updated
  }

  const handleDeleteFeedback = async (id: string) => {
    if (!submission) return
    await deleteFeedback(submission.id, id)
    setFeedbacks((prev) => prev.filter((f) => f.id !== id))
    if (activeFeedbackId === id) {
      setActiveFeedbackId(null)
    }
  }

  const handlePublishFeedback = async (id: string) => {
    if (!submission) return
    const published = await publishFeedback(submission.id, id)
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? published : f)))
    return published
  }

  const handlePublishMultipleFeedbacks = async (ids: string[]) => {
    if (!submission) return
    await publishMultipleFeedbacks(submission.id, ids)
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

      const refreshedSubmission = await getLecturerSubmission(courseId, jobsheetId, studentId, nativeScope)
      setSubmission(refreshedSubmission)
      setSuccessDecision(nextDecision)
      toast.success("Review berhasil disimpan dan submission diterima.")
      setIsEditingReview(false)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Gagal menyimpan review dosen.")
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
  const progressScore = submission?.calculatedProgressScore ?? submission?.scoreBreakdown?.progressScore ?? null
  const scoreBreakdownItems = submission?.scoreBreakdown?.items ?? []

  return (
    <LecturerLayout>
      {/* ── Confirm Delete AI Feedback Modal ── */}
      {confirmDeleteAiFeedback && (
        <LecturerModal
          title="Hapus Feedback AI?"
          onClose={() => setConfirmDeleteAiFeedback(false)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setConfirmDeleteAiFeedback(false)}>
                Batal
              </LecturerButton>
              <LecturerButton onClick={handleDeleteAiFeedback} disabled={deletingAiFeedback}>
                {deletingAiFeedback ? "Menghapus..." : "Ya, Hapus Feedback AI"}
              </LecturerButton>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            Feedback AI untuk submission ini akan dihapus. <strong>Data jobsheet dan task submission tidak akan diubah.</strong>
          </p>
          <p className="mt-2 text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.</p>
        </LecturerModal>
      )}

      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title="Review Pengerjaan Mahasiswa"
        subtitle={jobsheet ? `${jobsheet.title} - ${getSubmissionReviewStatus(submission)}` : undefined}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!jobsheet || !submission ? (
        <LecturerPanel className="p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Pengerjaan belum dapat direview</h2>
          <p className="mt-2 text-sm text-gray-600">
            Mahasiswa belum mengumpulkan pengerjaan ini dan belum memiliki submission otomatis.
          </p>
          <LecturerButton className="mt-5" variant="secondary" onClick={handleBack}>
            Kembali ke Monitor Mahasiswa
          </LecturerButton>
        </LecturerPanel>
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
                      <span className="font-bold">Mode Edit Penilaian Aktif:</span> Anda sedang mengubah penilaian dan feedback untuk pengerjaan ini. Klik <span className="font-semibold">Simpan & Publish Penilaian</span> di panel sebelah kanan (tab Jobsheet) setelah selesai.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Pengerjaan Sudah Dinilai:</span> Hasil review saat ini terkunci (read-only). Klik tombol di sebelah kanan jika ingin memperbarui penilaian.
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
                <span className="font-bold">Pengerjaan Belum Dikumpulkan:</span> Mahasiswa belum menyelesaikan jobsheet ini (status submission masih DRAFT). Anda hanya dapat memantau riwayat pengerjaan dan belum bisa melakukan review atau memberikan penilaian.
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
                  {submission && (submission as any).attemptLabel && (
                    <>
                      <dt className="text-gray-600 font-medium">Attempt / Pengerjaan</dt>
                      <dd className="text-gray-900">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded text-xs">
                          {(submission as any).attemptLabel}
                        </span>
                      </dd>
                    </>
                  )}
                  {submission?.isAutoSubmitted && (
                    <>
                      <dt className="text-gray-600 font-medium">Sumber Submission</dt>
                      <dd className="text-gray-900">
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded text-xs">
                          Dikumpulkan otomatis setelah deadline
                        </span>
                      </dd>
                    </>
                  )}
                </dl>
              </LecturerPanel>

              <LecturerPanel className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Nilai Progress Pengerjaan</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Nilai sistem berdasarkan bobot Dasar Teori, Percobaan, dan Latihan.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatScore(progressScore)}
                      <span className="text-sm font-semibold text-gray-500"> / 100</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Nilai final dosen: {formatScore(submission.review?.finalScore)}
                    </div>
                  </div>
                </div>

                {!scoreBreakdownItems.length ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center font-medium">
                    Nilai Progress belum tersedia untuk pengerjaan lama.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {scoreBreakdownItems.map((item) => (
                      <div key={`${item.type}-${item.itemId}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate" title={item.title}>
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {scoreItemTypeLabel(item.type)}
                              {item.totalSteps ? ` - ${item.completedSteps ?? 0}/${item.totalSteps} langkah` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 font-semibold text-blue-700">
                            {formatScore(item.earnedScore)} / {formatScore(item.weight)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-white">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(Math.max(item.completionRatio * 100, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                              Sedang Menganalisis Pengerjaan...
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
                          disabled={triggeringAi || deletingAiFeedback || submission.aiEvaluationStatus === "queued" || submission.aiEvaluationStatus === "processing"}
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
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteAiFeedback(true)}
                          disabled={
                            deletingAiFeedback ||
                            triggeringAi ||
                            submission.aiEvaluationStatus === "queued" ||
                            submission.aiEvaluationStatus === "processing" ||
                            (!submission.review?.aiFeedback && submission.score == null)
                          }
                          className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                        >
                          {deletingAiFeedback ? "Menghapus Feedback AI..." : "Hapus Feedback AI"}
                        </button>
                      </div>
                    </div>

                  </div>
                </LecturerPanel>
              )}

              {/* Collapsible Experiments review list */}
              <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-800">Percobaan Pengerjaan</h2>
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
                <h2 className="text-lg font-bold text-gray-800">Latihan Pengerjaan</h2>
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
                    Mahasiswa masih mengerjakan jobsheet ini. Anda hanya dapat memantau progres pengerjaan. Fitur penilaian, input nilai, dan feedback akan terbuka secara otomatis setelah pengerjaan dikumpulkan oleh mahasiswa.
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
                  aiScoreSummary={submission.review?.aiFeedback?.scoreSummary}
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
                  handleBack()
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
