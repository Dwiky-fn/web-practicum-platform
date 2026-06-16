import { useOutletContext, useNavigate, useParams, useLocation } from "react-router-dom"
import type { Jobsheet } from "../../../../../../services/jobsheet/types" 
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import SubmissionActivityTimeline from "./components/SubmissionActivityTimeline"

export default function TaskPage() {
  const navigate = useNavigate()
  const { courseId, jobsheetId } = useParams()
  const location = useLocation()

  const { jobsheet, submission } = useOutletContext<{
    jobsheet: Jobsheet
    submission: JobsheetSubmission
  }>()

  const submissionStatus = submission.status
  
  const canViewReview =
    submissionStatus === "ACCEPTED" ||
    submissionStatus === "REVISION" ||
    Boolean(submission.review)

  const canSubmit =
    submissionStatus === "DRAFT"

  const isWaiting =
    submissionStatus === "SUBMITTED" ||
    submissionStatus === "REVIEWING"

  return (
    <div className="space-y-10">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">Tugas</h1>
        <p className="text-gray-600 mt-1">
          Laporan Praktikum {jobsheet.title}
        </p>
      </div>

      {/* Konten Tengah */}
      <div className="max-w-3xl mx-auto">

        <div className="mt-25 bg-white rounded-2xl border shadow-sm overflow-hidden">

          <div className="p-8">
            <SubmissionActivityTimeline
              status={submissionStatus}
            />
          </div>

          <div className="px-6 py-4 flex justify-end">
            {canViewReview && (
              <button
                onClick={() =>
                  navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/review${location.search}`)
                }
                className="bg-blue-600 hover:bg-teal-600 transition text-white px-6 py-2 rounded-xl font-medium shadow-sm"
              >
                Lihat Detail Review
              </button>
            )}

            {canSubmit && (
              <button
                onClick={() =>
                  navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/preview${location.search}`)
                }
                className="bg-blue-600 hover:bg-teal-600 transition text-white px-6 py-2 rounded-xl font-medium shadow-sm"
              >
                Lanjut
              </button>
            )}

            {isWaiting && (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-6 py-2 rounded-xl font-medium cursor-not-allowed"
              >
                Sedang Direview
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
