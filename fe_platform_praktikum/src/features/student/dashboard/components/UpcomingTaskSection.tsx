import { useNavigate } from "react-router-dom"
import { ClipboardList } from "lucide-react"
import type { Jobsheet } from "../../../../services/jobsheet/types"
import type { JobsheetSubmission, SubmissionStatus } from "../../../../services/submission/types"
import { getDeadlineState, parseDeadline } from "../../../../shared/utils/deadline"
import { academicJobsheetPath } from "../../../../services/academicScope"
import UpcomingTaskSkeleton from "../loading/UpcomingSkeleton"
import { formatAcademicDate } from "../../../../shared/utils/formatAcademicDateTime"

interface UpcomingTaskSectionProps {
  jobsheets: Jobsheet[]
  submissions: JobsheetSubmission[]
  loading?: boolean
}

export default function UpcomingTaskSection({
  jobsheets,
  submissions,
  loading = false,
}: UpcomingTaskSectionProps) {
  const navigate = useNavigate()

  if (loading) {
    return <UpcomingTaskSkeleton />
  }

  const now = new Date()
  const submissionMap = new Map(submissions.map((submission) => [submission.jobsheetId, submission]))

  function getStatusLabel(status?: SubmissionStatus) {
    if (!status) return "Belum dikerjakan"

    switch (status) {
      case "DRAFT":
        return "Draft"
      case "REVISION":
        return "Perlu revisi"
      case "SUBMITTED":
      case "REVIEWING":
      case "ACCEPTED":
        return "Selesai"
      case "OVERDUE":
        return "Terlambat"
      default:
        return status
    }
  }

  function getStatusStyle(status?: SubmissionStatus) {
    if (!status || status === "DRAFT") return "bg-yellow-50 text-yellow-700"
    if (status === "REVISION" || status === "OVERDUE") return "bg-red-50 text-red-700"
    return "bg-green-50 text-green-700"
  }

  function getPriority(jobsheet: Jobsheet) {
    const submission = submissionMap.get(jobsheet.id)
    const deadline = parseDeadline(jobsheet.deadline)
    const isOverdue = deadline ? deadline.getTime() < now.getTime() : false

    if (submission?.status === "REVISION") return 0
    if (!submission && isOverdue) return 1
    if (submission?.status === "DRAFT" && isOverdue) return 1
    if (!submission || submission.status === "DRAFT") return 2

    return 3
  }

  const upcomingJobsheets = jobsheets
  .filter((job) => {
    if (job.status === "UNPUBLISHED") {
      return false
    }
    const submission = submissionMap.get(job.id)

    if (
      submission?.status === "SUBMITTED" ||
      submission?.status === "REVIEWING" ||
      submission?.status === "ACCEPTED"
    ) {
      return false
    }

    return true
  })
  .sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b)
    if (priorityDiff !== 0) return priorityDiff

    return (
      (parseDeadline(a.deadline)?.getTime() ?? 0) -
      (parseDeadline(b.deadline)?.getTime() ?? 0)
    )
  })
  .slice(0, 3) // tampilkan 3 terdekat saja

  if (upcomingJobsheets.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-10 px-6 text-center shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <ClipboardList className="text-gray-400" size={32} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Tidak Ada Praktikum</h3>
        <p className="mt-1.5 max-w-sm text-sm text-gray-500">
          Saat ini tidak ada tugas atau jobsheet praktikum yang perlu Anda kerjakan.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
      {upcomingJobsheets.map((jobsheet) => {
        const deadlineState = getDeadlineState(jobsheet.deadline, now)
        const submission = submissionMap.get(jobsheet.id)
        const status = submission?.status
        const isOverdue = deadlineState.isOverdue && (!status || status === "DRAFT")

        return (
          <button
            key={jobsheet.id}
            type="button"
            onClick={() =>
              navigate(academicJobsheetPath(jobsheet.courseId, jobsheet.id, {
                mataKuliahId: jobsheet.mataKuliahId,
                kelasPraktikumId: jobsheet.kelasPraktikumId,
              }))
            }
            className="w-full p-5 flex justify-between items-center gap-4 text-left hover:bg-blue-50/40 active:bg-blue-50/70 transition-all duration-150"
          >
            <div className="min-w-0">
              <p className="font-bold text-gray-900 line-clamp-1 hover:text-blue-700 transition-colors">
                {jobsheet.title}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusStyle(status)}`}>
                  {getStatusLabel(isOverdue ? "OVERDUE" : status)}
                </span>
                <span className={`text-xs font-medium ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                  {deadlineState.label}
                </span>
              </div>
            </div>

            <span
              className={`shrink-0 text-xs font-bold ${
                isOverdue ? "text-red-600" : "text-gray-600"
              }`}
            >
              {formatAcademicDate(jobsheet.deadline)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
