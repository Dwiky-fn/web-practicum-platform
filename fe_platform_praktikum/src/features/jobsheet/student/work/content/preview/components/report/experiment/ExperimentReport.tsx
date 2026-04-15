import type { Jobsheet } from "../../../../../../../../../entities/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../../entities/jobsheetSubmission/types"
import { extractSteps } from "../../../../../../../../../shared/utils/extractSteps"

import ExperimentItem from "./ExperimentItem"

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
}

export default function ExperimentReport({
  jobsheet,
  submission,
}: Props) {

  const experimentsSubmission = submission?.experiments ?? []

  const experimentList = jobsheet.experiments

  const submissionMap = Object.fromEntries(
    experimentsSubmission.map((s) => [s.experimentId, s])
  )

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Percobaan
      </div>

      {/* Content */}
      <div className="p-6 space-y-10">

        {experimentList.map((exp, index) => {

          const submissionData = submissionMap[exp.id]

          return (
            <ExperimentItem
              key={exp.id}
              title={exp.title}
              index={index}
              instructionSteps={extractSteps(exp.instructionContent)}
              steps={submissionData?.steps ?? []}
            />
          )
        })}

        {experimentList.length === 0 && (
          <p className="text-sm text-gray-500 text-center">
            Tidak ada percobaan
          </p>
        )}

      </div>
    </div>
  )
}