import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { getJobsheetById } from "../../../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetId } from "../../../../../../../services/submission/service"
import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../services/submission/types"
import StudentIdentityCard from "../components/StudentIdentityCard"
import TopProgressBar from "../../../../../../../components/loading/TopProgressBar"
import ConclusionEditor from "../components/ConclusionEditor"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import Navbar from "../../../../../../../components/navbar/Navbar"
import ScrollToTopButton from "../../../../../../../components/ScrollToTopButton"
import ExperimentReviewCard from "../../../../../../lecturer/components/review/ExperimentReviewCard"
import JobsheetFeedbackCard from "../../../../../../lecturer/components/review/JobsheetFeedbackCard"
import {
  getFeedbacks,
} from "../../../../../../../services/reviewFeedbackService"
import type { ReviewFeedback } from "../../../../../../../services/reviewFeedbackService"
import { academicJobsheetPath, type AcademicScope } from "../../../../../../../services/academicScope"

const emptyDoc = { type: "doc" as const, content: [] }

export default function ReviewPage() {
  const navigate = useNavigate()
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get("classId") || undefined
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const submissionIdQuery = searchParams.get("submissionId") || undefined
  const remedialIdQuery = searchParams.get("remedialId") || undefined
  const attemptTypeQuery = (searchParams.get("attemptType") as "normal" | "remedial" | null) || undefined
  const attemptNoQuery = searchParams.get("attemptNo") ? Number(searchParams.get("attemptNo")) : undefined

  const effectiveCourseId = mataKuliahId || courseId
  const { user } = useCurrentUser()
  const academicScope: AcademicScope = useMemo(
    () => ({
      classId,
      mataKuliahId,
      kelasPraktikumId,
      submissionId: submissionIdQuery,
      remedialId: remedialIdQuery,
      attemptType: attemptTypeQuery,
      attemptNo: attemptNoQuery,
    }),
    [classId, mataKuliahId, kelasPraktikumId, submissionIdQuery, remedialIdQuery, attemptTypeQuery, attemptNoQuery],
  )
  const backPath = jobsheetId && effectiveCourseId
    ? academicJobsheetPath(effectiveCourseId, jobsheetId, { classId, mataKuliahId, kelasPraktikumId })
    : "/mata-kuliah"

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
  const [expandedExperiments, setExpandedExperiments] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadData() {
      if (!effectiveCourseId || !jobsheetId || !user) return

      setLoading(true)
      setError("")

      try {
        const selected = await getJobsheetById(effectiveCourseId, jobsheetId, academicScope)
        const sub = await getSubmissionByJobsheetId(effectiveCourseId, jobsheetId, user.id, academicScope)

        setJobsheet(selected || null)
        setSubmission(sub)

        if (sub) {
          const fbs = await getFeedbacks(sub.id)
          setFeedbacks(fbs)
          // Expand experiments that have active feedbacks initially
          const expWithFbs: Record<string, boolean> = {}
          fbs.forEach(fb => {
            if (fb.experimentId && (fb.status === "published" || fb.status === "resolved")) {
              expWithFbs[fb.experimentId] = true
            }
          })
          setExpandedExperiments(expWithFbs)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat hasil review.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [academicScope, effectiveCourseId, jobsheetId, user])

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

  const sectionEvaluations = useMemo(() => {
    if (!jobsheet || !submission) return {}

    const result: Record<string, { score: string; feedback: string }> = {}

    const existing = submission.review?.aiFeedback?.sectionEvaluations
    if (Array.isArray(existing) && existing.length) {
      existing.forEach((item: any) => {
        if (item.type && item.sectionId) {
          result[`${item.type}:${item.sectionId}`] = {
            score: item.score != null ? String(item.score) : "",
            feedback: item.feedback || item.aiFeedback || "",
          }
        }
      })
    } else {
      const aiResults = Array.isArray(submission.review?.aiFeedback?.experimentResults)
        ? submission.review?.aiFeedback?.experimentResults
        : []
      aiResults.forEach((item: any) => {
        if (item.experimentId) {
          const scores = Array.isArray(item.rubricScores) ? item.rubricScores : []
          const score = scores.reduce((sum: number, r: any) => sum + Number(r.score || 0), 0)
          const feedback = item.summary || scores.map((r: any) => r.reason).filter(Boolean).join("\n")
          result[`experiment:${item.experimentId}`] = {
            score: String(score),
            feedback,
          }
        }
      })
    }

    return result
  }, [jobsheet, submission])

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleSelectFeedback = (id: string | null) => {
    setActiveFeedbackId(id)
    if (id) {
      const fb = feedbacks.find(f => f.id === id)
      if (fb && fb.experimentId) {
        setExpandedExperiments(prev => ({ ...prev, [fb.experimentId!]: true }))
        setTimeout(() => {
          const isExercise = jobsheet?.exercises.some(e => e.id === fb.experimentId)
          const elementId = isExercise ? `exercise-card-${fb.experimentId}` : `experiment-card-${fb.experimentId}`
          scrollToElement(elementId)
        }, 150)
      }
    }
  }

  if (loading) {
    return <TopProgressBar />
  }

  if (!jobsheet || !submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error || "Hasil review belum tersedia untuk jobsheet ini."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
        {/* Top Header & Back Button */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Kembali</span>
          </button>
          <span className="text-sm font-bold text-gray-800">{jobsheet.title}</span>
        </div>

        {/* Information & Score Card */}
        <StudentIdentityCard jobsheet={jobsheet} submission={submission} />

        {/* Collapsible Experiments */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center justify-between">
            <span>Percobaan Pengerjaan</span>
            <span className="text-xs font-normal text-gray-500">
              {experimentReports.length} Percobaan Tersedia
            </span>
          </h3>
          {!experimentReports.length ? (
            <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-center italic">
              Tidak ada percobaan pada jobsheet ini.
            </p>
          ) : (
            experimentReports.map(({ experiment, steps }) => (
              <div key={experiment.id} id={`experiment-card-${experiment.id}`} className="w-full max-w-full overflow-hidden">
                <ExperimentReviewCard
                  submissionId={submission.id}
                  experiment={experiment}
                  steps={steps}
                  feedbacks={feedbacks}
                  readOnly={true}
                  activeFeedbackId={activeFeedbackId}
                  onSelectFeedback={handleSelectFeedback}
                  isExpandedByDefault={!!expandedExperiments[experiment.id]}
                  isStudent={true}
                  rubric={Number(experiment.rubric || 0)}
                  evaluation={sectionEvaluations[`experiment:${experiment.id}`]}
                />
              </div>
            ))
          )}
        </div>

        {/* Collapsible Latihan */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center justify-between">
            <span>Latihan Pengerjaan</span>
            <span className="text-xs font-normal text-gray-500">
              {exerciseReports.length} Latihan Tersedia
            </span>
          </h3>
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
                <div key={exercise.id} id={`exercise-card-${exercise.id}`} className="w-full max-w-full overflow-hidden">
                  <ExperimentReviewCard
                    submissionId={submission.id}
                    experiment={{
                      id: exercise.id,
                      title: exercise.title,
                      order: exercise.order,
                      instructionContent: exercise.instructionContent,
                    }}
                    steps={exerciseSteps}
                    feedbacks={feedbacks}
                    readOnly={true}
                    activeFeedbackId={activeFeedbackId}
                    onSelectFeedback={handleSelectFeedback}
                    isExpandedByDefault={!!expandedExperiments[exercise.id]}
                    type="exercise"
                    isStudent={true}
                    rubric={Number(exercise.rubric || 0)}
                    evaluation={sectionEvaluations[`exercise:${exercise.id}`]}
                  />
                </div>
              )
            })
          )}
        </div>

        {/* Conclusion */}
        <ConclusionEditor
          jobsheet={jobsheet}
          submission={submission}
          readOnly={true}
        />

        {/* Overall Jobsheet Feedback */}
        <div id="jobsheet-feedback">
          <JobsheetFeedbackCard
            feedbacks={feedbacks}
            readOnly={true}
            activeFeedbackId={activeFeedbackId}
            onSelectFeedback={handleSelectFeedback}
            lecturerFeedback={submission.review?.lecturerFeedback}
          />
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  )
}
