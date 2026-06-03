import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { getJobsheetById } from "../../../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetIdPreview, submitSubmission, updateSubmission } from "../../../../../../../services/submission/service"

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

export default function PreviewPage() {

  const { courseId, jobsheetId } = useParams()
  const navigate = useNavigate()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!courseId || !jobsheetId || !submission) return
    try {
      setSubmitting(true)
      await updateSubmission(courseId, jobsheetId, buildReport(submission))

      await submitSubmission(courseId, jobsheetId)
      setShowSuccess(true)
    } catch (err) {
      console.error("Submit error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) return

      setLoading(true)

      try {
        const jobsheets = await getJobsheetById(courseId, jobsheetId)

        setJobsheet(jobsheets)

        const sub = await getSubmissionByJobsheetIdPreview(courseId, jobsheetId)

        setJobsheet(jobsheets || null)
        setSubmission(sub)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, jobsheetId])

  if (loading || !jobsheet || !submission) {
    return <TopProgressBar />
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
            onClick={() => navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/works/task`)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Kembali ke Tugas
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
                onChange={(data) => {
                  setSubmission(prev => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      conclusion: {
                        content: data.content,
                        wordCount: data.wordCount,
                      }
                    }
                  })
                }}
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
                />
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
  </>
)
}