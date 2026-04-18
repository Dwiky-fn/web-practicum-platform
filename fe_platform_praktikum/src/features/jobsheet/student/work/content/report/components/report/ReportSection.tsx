import type { Jobsheet } from "../../../../../../../../entities/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../entities/jobsheetSubmission/types" 

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
  return (
    <div className="space-y-8">

      {/* ===== Percobaan ===== */}
      <ExperimentReport
        jobsheet={jobsheet}
        submission={submission}
      />

      {/* ===== Latihan ===== */}
      <ExerciseReport
        jobsheet={jobsheet}
        submission={submission}
      />

    </div>
  )
}