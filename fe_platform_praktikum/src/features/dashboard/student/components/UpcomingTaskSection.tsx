import { useNavigate } from "react-router-dom"
import type { Jobsheet } from "../../../../services/jobsheet/types"
import type { JobsheetSubmission, SubmissionStatus } from "../../../../services/submission/types"
import { getDeadlineState, parseDeadline } from "../../../../shared/utils/deadline"
import UpcomingTaskSkeleton from "../loading/UpcomingSkeleton"

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
      <div className="bg-white rounded-2xl shadow-sm p-6 text-gray-500">
        Tidak ada tugas terdekat
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y overflow-hidden">
      {upcomingJobsheets.map((jobsheet) => {
        const deadlineDate = new Date(jobsheet.deadline)
        const deadlineState = getDeadlineState(jobsheet.deadline, now)
        const submission = submissionMap.get(jobsheet.id)
        const status = submission?.status
        const isOverdue = deadlineState.isOverdue && (!status || status === "DRAFT")

        return (
          <button
            key={jobsheet.id}
            type="button"
            onClick={() => navigate(`/courses/${jobsheet.courseId}/jobsheets/${jobsheet.id}/works`)}
            className="w-full p-6 flex justify-between items-center gap-4 text-left hover:bg-gray-50 active:bg-gray-50 transition"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-800">
                {jobsheet.title}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(status)}`}>
                  {getStatusLabel(isOverdue ? "OVERDUE" : status)}
                </span>
                <span className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                  {deadlineState.label}
                </span>
              </div>
            </div>

            <span
              className={`shrink-0 text-sm font-medium ${
                isOverdue ? "text-red-500" : "text-gray-500"
              }`}
            >
              {deadlineDate.toLocaleDateString("id-ID")}
            </span>
          </button>
        )
      })}
    </div>
  )
}
