import type { Jobsheet } from "../../../../entities/jobsheet/types"
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
    // filter yang sudah lewat deadline
    if (new Date(job.deadline).getTime() < now.getTime()) {
      return false
    }
    return true
  })
  .sort((a, b) => {
    return (
      new Date(a.deadline).getTime() -
      new Date(b.deadline).getTime()
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
        const diffTime = deadlineDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
                {diffDays === 0 ? "Deadline hari ini" : `${diffDays} hari lagi`}
              </p>
            </div>

            <span
              className={`text-sm font-medium ${
                diffDays <= 2 ? "text-red-500" : "text-gray-500"
              }`}
            >
              {jobsheet.deadline}
            </span>
          </div>
        )
      })}
    </div>
  )
}