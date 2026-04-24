import type { Jobsheet } from "../../../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../../services/submission/types"
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

  console.log("🔥 EXPERIMENT LIST:", jobsheet.experiments)
  console.log("🔥 SUBMISSION EXP:", submission.experiments)

  const experimentsSubmission = submission?.experiments ?? []
  const experimentList = jobsheet.experiments

  const submissionMap = Object.fromEntries(
    experimentsSubmission.map((s) => [s.experimentId, s])
  )

  // 🔥 hitung total step yang punya komentar (UX bonus)
  const comments = submission.review?.comments ?? []

  const totalCommentedSteps = comments.filter(c => c.experimentId).length

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b flex justify-between items-center">

        <p className="font-semibold text-gray-800">
          Percobaan
        </p>

        {/* 🔥 BADGE GLOBAL */}
        {totalCommentedSteps > 0 && (
          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
            {totalCommentedSteps} perlu revisi
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-10">

        {experimentList.map((exp, index) => {
          console.log("🔥 LOOP EXP:", exp.id)

          const submissionData = submissionMap[exp.id]

          return (
            <ExperimentItem
              key={exp.id}
              title={exp.title}
              index={index}
              experimentId={exp.id} // 🔥 FIX PENTING
              instructionSteps={extractSteps(exp.instructionContent)}
              steps={submissionData?.steps ?? []}
              submission={submission}
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