import type { Jobsheet } from "../../../../services/jobsheet/types"
import { getDeadlineState, parseDeadline } from "../../../../shared/utils/deadline"
import UpcomingTaskSkeleton from "../loading/UpcomingSkeleton"

interface UpcomingTaskSectionProps {
  jobsheets: Jobsheet[]
  loading?: boolean
}

export default function UpcomingTaskSection({
  jobsheets,
  loading = false,
}: UpcomingTaskSectionProps) {

  if (loading) {
    return <UpcomingTaskSkeleton />
  }

  const now = new Date()

  const upcomingJobsheets = jobsheets
  .filter((job) => {
    if (job.status === "ACCEPTED" || job.status === "UNPUBLISHED") {
      return false
    }
    const deadline = parseDeadline(job.deadline)

    if (!deadline || deadline.getTime() < now.getTime()) {
      return false
    }
    return true
  })
  .sort((a, b) => {
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

        return (
          <div
            key={jobsheet.id}
            className="p-6 flex justify-between items-center hover:bg-gray-50 transition"
          >
            <div>
              <p className="font-medium text-gray-800">
                {jobsheet.title}
              </p>

              <p className="text-sm text-gray-500">
                {deadlineState.label}
              </p>
            </div>

            <span
              className={`text-sm font-medium ${
                deadlineState.isOverdue ? "text-red-500" : "text-gray-500"
              }`}
            >
              {deadlineDate.toLocaleDateString("id-ID")}
            </span>
          </div>
        )
      })}
    </div>
  )
}
