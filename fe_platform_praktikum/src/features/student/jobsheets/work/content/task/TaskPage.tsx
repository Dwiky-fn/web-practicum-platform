import { useOutletContext, useNavigate, useParams, useLocation } from "react-router-dom"
import { useState } from "react"
import type { Jobsheet } from "../../../../../../services/jobsheet/types" 
import type { JobsheetSubmission } from "../../../../../../services/submission/types"
import { academicJobsheetSubPath } from "../../../../../../services/academicScope"
import SubmissionActivityTimeline from "./components/SubmissionActivityTimeline"
import { submitSubmission, updateSubmission } from "../../../../../../services/submission/service"
import { updateStudentProgressApi } from "../../../../../../services/progress/service"
import { buildReport } from "../../../../../../services/submission/buildReport"
import { useCurrentUser } from "../../../../../../services/user/useCurrentUser"
import { toast } from "../../../../../../components/toast/toastStore"
import { CheckCircle, AlertTriangle } from "lucide-react"

export default function TaskPage() {
  const navigate = useNavigate()
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const effectiveCourseId = routeMataKuliahId || courseId || ""
  const academicScope = {
    classId: searchParams.get("classId") || undefined,
    mataKuliahId: routeMataKuliahId || searchParams.get("mataKuliahId") || undefined,
    kelasPraktikumId: searchParams.get("kelasPraktikumId") || undefined,
  }

  const { jobsheet, submission, readOnly } = useOutletContext<{
    jobsheet: Jobsheet
    submission: JobsheetSubmission
    readOnly: boolean
  }>()

  const { user } = useCurrentUser()
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!effectiveCourseId || !jobsheetId || !submission || !user || readOnly || !jobsheet.access?.canSubmit) return
    try {
      setSubmitting(true)
      await updateSubmission(effectiveCourseId, jobsheetId, user.id, buildReport(submission), undefined, academicScope)

      await submitSubmission(effectiveCourseId, jobsheetId, user.id, academicScope)
      await updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        kelasPraktikumId: academicScope.kelasPraktikumId,
        activityType: "submit_answer",
      }).catch(() => { /* silent: tracking is non-critical */ })
      setConfirmSubmitOpen(false)
      setShowSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengumpulkan jobsheet.")
    } finally {
      setSubmitting(false)
    }
  }

  const submissionStatus = submission.status
  
  const canViewReview =
    submissionStatus === "ACCEPTED" ||
    submissionStatus === "REVISION" ||
    Boolean(submission.review)

  const canSubmit =
    submissionStatus === "DRAFT" && !readOnly && Boolean(jobsheet.access?.canSubmit ?? true)

  const isWaiting =
    submissionStatus === "SUBMITTED" ||
    submissionStatus === "REVIEWING"

  return (
    <div className="space-y-10">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">Tugas</h1>
        <p className="text-gray-600 mt-1">
          Jobsheet Praktikum {jobsheet.title}
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
                  navigate(academicJobsheetSubPath(effectiveCourseId, jobsheetId || "", "review", academicScope))
                }
                className="bg-blue-600 hover:bg-teal-600 transition text-white px-6 py-2 rounded-xl font-medium shadow-sm"
              >
                Lihat Detail Review
              </button>
            )}

            {canSubmit && (
              <button
                onClick={() => setConfirmSubmitOpen(true)}
                className="bg-blue-600 hover:bg-teal-600 transition text-white px-6 py-2 rounded-xl font-medium shadow-sm"
              >
                Kumpulkan Jobsheet
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

      {confirmSubmitOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="text-amber-500" size={48} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Kumpulkan Jobsheet?
            </h2>
            <p className="text-sm text-gray-500">
              Pengerjaan Anda akan dikirimkan untuk direview oleh Dosen. Anda tidak dapat mengubah jawaban setelah mengumpulkan.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-blue-400"
              >
                {submitting ? "Mengirim..." : "Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="text-green-500" size={48} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Jobsheet Berhasil Dikumpulkan!
            </h2>
            <p className="text-sm text-gray-500">
              Jobsheet Anda telah berhasil dikirim.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Kembali"
              title="Kembali"
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <span>Kembali</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
