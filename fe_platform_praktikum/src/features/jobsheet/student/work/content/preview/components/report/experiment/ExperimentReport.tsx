import type { Jobsheet } from "../../../../../../../../../entities/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../../entities/jobsheetSubmission/types"

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

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Percobaan
      </div>

      {/* Content */}
      <div className="p-6 space-y-10">

        {experimentList.map((exp, index) => {

          const submissionData = experimentsSubmission.find(
            (s) => s.experimentId === exp.id
          )

          return (
            <ExperimentItem
              key={exp.id}
              title={exp.title}
              index={index}
              instructionSteps={exp.instructionSteps}
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