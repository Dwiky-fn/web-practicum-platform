import { useParams, useSearchParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { getJobsheetById } from "../../../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetId } from "../../../../../../../services/submission/service"
import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../services/submission/types"
import ReportHeader from "../components/ReportHeader"
import StudentIdentityCard from "../components/StudentIdentityCard"
import TopProgressBar from "../../../../../../../components/loading/TopProgressBar"
import ConclusionEditor from "../components/ConclusionEditor"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import Navbar from "../../../../../../../components/navbar/Navbar"
import ScrollToTopButton from "../../../../../../../components/ScrollToTopButton"
import ReviewSummaryBanner from "./components/ReviewSummaryBanner"
import StudentReviewPanel from "./components/StudentReviewPanel"
import ExperimentReviewCard from "../../../../../../lecturer/components/review/ExperimentReviewCard"
import JobsheetFeedbackCard from "../../../../../../lecturer/components/review/JobsheetFeedbackCard"
import {
  getFeedbacks,
} from "../../../../../../../services/reviewFeedbackService"
import type { ReviewFeedback } from "../../../../../../../services/reviewFeedbackService"
import { academicJobsheetSubPath, type AcademicScope } from "../../../../../../../services/academicScope"

const emptyDoc = { type: "doc" as const, content: [] }

export default function ReviewPage() {
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get("classId") || undefined
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const effectiveCourseId = mataKuliahId || courseId
  const { user } = useCurrentUser()
  const academicScope: AcademicScope = useMemo(
    () => ({ classId, mataKuliahId, kelasPraktikumId }),
    [classId, mataKuliahId, kelasPraktikumId],
  )
  const taskPath = jobsheetId && effectiveCourseId
    ? academicJobsheetSubPath(effectiveCourseId, jobsheetId, "works/task", academicScope)
    : "/mata-kuliah"

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
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

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleBannerClick = (scope: "code" | "experiment" | "jobsheet") => {
    if (scope === "code") {
      setIsPanelOpen(true)
      const firstCodeFb = feedbacks.find(f => f.scope === "code" && (f.status === "published" || f.status === "resolved"))
      if (firstCodeFb && firstCodeFb.experimentId) {
        setExpandedExperiments(prev => ({ ...prev, [firstCodeFb.experimentId!]: true }))
        setTimeout(() => {
          const isExercise = jobsheet?.exercises.some(e => e.id === firstCodeFb.experimentId)
          const elementId = isExercise ? `exercise-card-${firstCodeFb.experimentId}` : `experiment-card-${firstCodeFb.experimentId}`
          scrollToElement(elementId)
        }, 150)
      }
    } else if (scope === "experiment") {
      const firstExpFb = feedbacks.find(f => f.scope === "experiment" && (f.status === "published" || f.status === "resolved"))
      if (firstExpFb && firstExpFb.experimentId) {
        setExpandedExperiments(prev => ({ ...prev, [firstExpFb.experimentId!]: true }))
        setTimeout(() => {
          const isExercise = jobsheet?.exercises.some(e => e.id === firstExpFb.experimentId)
          const elementId = isExercise ? `exercise-card-${firstExpFb.experimentId}` : `experiment-card-${firstExpFb.experimentId}`
          scrollToElement(elementId)
        }, 100)
      } else if (jobsheet?.experiments.length) {
        const firstId = jobsheet.experiments[0].id
        setExpandedExperiments(prev => ({ ...prev, [firstId]: true }))
        setTimeout(() => {
          scrollToElement(`experiment-card-${firstId}`)
        }, 100)
      }
    } else if (scope === "jobsheet") {
      scrollToElement("jobsheet-feedback")
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <ReportHeader
        title={jobsheet.title}
        backTo={taskPath}
      />

      <div className="px-6 py-8 lg:px-16 max-w-7xl mx-auto space-y-6">
        {/* Summary Banner */}
        <ReviewSummaryBanner
          feedbacks={feedbacks}
          onClickItem={handleBannerClick}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="space-y-6">
            <StudentIdentityCard jobsheet={jobsheet} />

            {/* Collapsible Experiments */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Percobaan</h3>
              {!experimentReports.length ? (
                <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-center italic">
                  Tidak ada percobaan pada jobsheet ini.
                </p>
              ) : (
                experimentReports.map(({ experiment, steps }) => (
                  <div key={experiment.id} id={`experiment-card-${experiment.id}`}>
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
                    />
                  </div>
                ))
              )}
            </div>

            {/* Collapsible Latihan */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Latihan</h3>
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
                    <div key={exercise.id} id={`exercise-card-${exercise.id}`}>
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
              />
            </div>
          </div>

          {/* Student review side panel */}
          <div className="sticky top-6">
            <StudentReviewPanel
              feedbacks={feedbacks}
              activeFeedbackId={activeFeedbackId}
              onSelectFeedback={handleSelectFeedback}
              isOpen={isPanelOpen}
              onClose={() => setIsPanelOpen(false)}
              experiments={jobsheet.experiments}
              exercises={jobsheet.exercises}
            />
          </div>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  )
}
