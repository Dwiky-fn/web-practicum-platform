import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useState, useCallback } from "react"
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
import { CheckCircle } from "lucide-react"
import { buildReport } from "../../../../../../../services/submission/buildReport"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import ScrollToTopButton from "../../../../../../../components/ScrollToTopButton"
import { toast } from "../../../../../../../components/toast/toastStore"

export default function PreviewPage() {

  const { courseId, jobsheetId } = useParams()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get("classId") || undefined
  const { user } = useCurrentUser()
  const navigate = useNavigate()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState("")

  const handleSaveDraft = async () => {
    if (!courseId || !jobsheetId || !submission || !user) return
    try {
      setSavingDraft(true)
      setError("")
      await updateSubmission(courseId, jobsheetId, user.id, buildReport(submission))
      toast.success("Draf laporan berhasil disimpan.")
    } catch (err) {
      console.error("Save draft error:", err)
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan draf.")
    } finally {
      setSavingDraft(false)
    }
  }

  const handleConclusionChange = useCallback((data: { content: any; wordCount: number }) => {
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
    if (!courseId || !jobsheetId || !submission || !user) return
    try {
      setSubmitting(true)
      setError("")
      await updateSubmission(courseId, jobsheetId, user.id, buildReport(submission))

      await submitSubmission(courseId, jobsheetId, user.id)
      await updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        activityType: "submit_answer",
      }).catch(console.error)
      setShowSuccess(true)
    } catch (err) {
      console.error("Submit error:", err)
      setError(err instanceof Error ? err.message : "Gagal submit laporan.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId || !user) return

      setLoading(true)
      setError("")

      try {
        const jobsheets = await getJobsheetById(courseId, jobsheetId, classId)

        setJobsheet(jobsheets)

        const sub = await getSubmissionByJobsheetIdPreview(
          courseId,
          jobsheetId,
          user.id,
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
  }, [classId, courseId, jobsheetId, user])

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
            onClick={() => navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/works/task`)}
            aria-label="Kembali"
            title="Kembali"
            className="w-full flex items-center justify-center py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>
    )}

    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <ReportHeader
        title={jobsheet.title}
        backTo={`/courses/${courseId}/jobsheets/${jobsheet.id}/works/task`}
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
