import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useMemo, useState, useCallback } from "react"
import { getJobsheetById } from "../../../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetIdPreview, submitSubmission, updateSubmission } from "../../../../../../../services/submission/service"
import { updateStudentProgressApi } from "../../../../../../../services/progress/service"

import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../services/submission/types"

import StudentIdentityCard from "../components/StudentIdentityCard"
import ReportSection from "../components/report/ReportSection"
import ConclusionEditor from "../components/ConclusionEditor"
import SubmissionValidationCard from "./components/SubmissionValidationCard"
import ReportHeader from "../components/ReportHeader"
import TopProgressBar from "../../../../../../../components/loading/TopProgressBar"
import { CheckCircle, ArrowLeft } from "lucide-react"
import { buildReport } from "../../../../../../../services/submission/buildReport"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import ScrollToTopButton from "../../../../../../../components/ScrollToTopButton"
import { toast } from "../../../../../../../components/toast/toastStore"
import { academicJobsheetSubPath, type AcademicScope } from "../../../../../../../services/academicScope"
import type { JSONContent } from "@tiptap/react"

export default function PreviewPage() {

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
  const navigate = useNavigate()
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState("")

  const handleSaveDraft = async () => {
    if (!effectiveCourseId || !jobsheetId || !submission || !user) return
    try {
      setSavingDraft(true)
      setError("")
      await updateSubmission(effectiveCourseId, jobsheetId, user.id, buildReport(submission), undefined, academicScope)
      toast.success("Draf laporan berhasil disimpan.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan draf.")
    } finally {
      setSavingDraft(false)
    }
  }

  const handleConclusionChange = useCallback((data: { content: JSONContent; wordCount: number }) => {
    setSubmission(prev => {
      if (!prev) return prev
      return {
        ...prev,
        conclusion: {
          content: data.content,
          wordCount: data.wordCount,
        },
        report: {
          ...prev.report,
          conclusion: {
            content: data.content,
            wordCount: data.wordCount,
          }
        }
      }
    })
  }, [])

  const handleSubmit = async () => {
    if (!effectiveCourseId || !jobsheetId || !submission || !user) return
    try {
      setSubmitting(true)
      setError("")
      await updateSubmission(effectiveCourseId, jobsheetId, user.id, buildReport(submission), undefined, academicScope)

      await submitSubmission(effectiveCourseId, jobsheetId, user.id, academicScope)
      await updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        kelasPraktikumId,
        activityType: "submit_answer",
      }).catch(() => { /* silent: tracking is non-critical */ })
      setShowSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal submit laporan.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!effectiveCourseId || !jobsheetId || !user) return

      setLoading(true)
      setError("")

      try {
        const jobsheets = await getJobsheetById(effectiveCourseId, jobsheetId, academicScope)

        setJobsheet(jobsheets)

        const sub = await getSubmissionByJobsheetIdPreview(
          effectiveCourseId,
          jobsheetId,
          user.id,
          academicScope,
        )

        setJobsheet(jobsheets || null)
        setSubmission(sub)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat preview laporan.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [academicScope, effectiveCourseId, jobsheetId, user])

  if (loading) {
    return <TopProgressBar />
  }

  if (!jobsheet || !submission) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Preview laporan tidak tersedia."}
        </div>
      </div>
    )
  }

  return (
  <>
    {/* SUCCESS MODAL */}
    {showSuccess && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Jobsheet Berhasil di-Submit!
          </h2>
          <p className="text-sm text-gray-500">
            Laporan kamu telah berhasil dikirim.
          </p>
          <button
            type="button"
            onClick={() => navigate(taskPath)}
            aria-label="Kembali"
            title="Kembali"
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <ArrowLeft size={20} />
            <span>Kembali</span>
          </button>
        </div>
      </div>
    )}

    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <ReportHeader
        title={jobsheet.title}
        backTo={taskPath}
      />

      {/* CONTENT WRAPPER */}
      <div className="px-6 py-8 lg:px-16">
        {error && (
          <div className="mx-auto mb-6 max-w-6xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CENTERED CONTAINER */}
        <div className="max-w-6xl mx-auto">

          {/* GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">

              <StudentIdentityCard jobsheet={jobsheet} />

              <ReportSection
                jobsheet={jobsheet}
                submission={submission}
              />

               <ConclusionEditor
                jobsheet={jobsheet}
                submission={submission}
                onChange={handleConclusionChange}
              />

            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1 space-y-6">

               <div className="sticky top-6">
                <SubmissionValidationCard
                  jobsheet={jobsheet}
                  submission={submission}
                  onSubmit={handleSubmit}
                  submitting={submitting} 
                  onSaveDraft={handleSaveDraft}
                  savingDraft={savingDraft}
                />
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
    <ScrollToTopButton />
  </>
)
}
