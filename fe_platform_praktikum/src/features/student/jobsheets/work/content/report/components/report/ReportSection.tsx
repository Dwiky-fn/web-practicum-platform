import type { Jobsheet } from "../../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../services/submission/types"

import ExperimentReport from "./experiment/ExperimentReport"
import ExerciseReport from "./exercise/ExerciseReport"

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
  readonly?: boolean
}

export default function ReportSection({
  jobsheet,
  submission,
}: Props) {
  const reportedJobsheet = {
    ...jobsheet,
    experiments: jobsheet.experiments.filter((item) => item.isReported),
    exercises: jobsheet.exercises.filter((item) => item.isReported),
  }

  return (
    <div className="space-y-8">

      {/* ===== Percobaan ===== */}
      <ExperimentReport
        jobsheet={reportedJobsheet}
        submission={submission}
      />

      {/* ===== Latihan ===== */}
      <ExerciseReport
        jobsheet={reportedJobsheet}
        submission={submission}
      />

    </div>
  )
}
