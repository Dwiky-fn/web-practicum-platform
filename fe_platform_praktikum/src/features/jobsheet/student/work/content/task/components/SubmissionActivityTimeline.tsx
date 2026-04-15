import { CheckCircle, Clock, XCircle } from "lucide-react"
import type { JobsheetStatus } from "../../../../../../../entities/jobsheet/types"

interface Props {
  status: JobsheetStatus
}

type StepState = "completed" | "active" | "pending" | "rejected"

function getStepStates(
  status: JobsheetStatus
): {
  upload: StepState
  review: StepState
  result: StepState
} {
  switch (status) {
    case "SUBMITTED":
      return {
        upload: "completed",
        review: "pending",
        result: "pending",
      }
    case "REVIEWING":
      return {
        upload: "completed",
        review: "active",
        result: "pending",
      }
    case "ACCEPTED":
      return {
        upload: "completed",
        review: "completed",
        result: "completed",
      }
    case "REVISION":
      return {
        upload: "completed",
        review: "completed",
        result: "rejected",
      }
    default:
      return {
        upload: "pending",
        review: "pending",
        result: "pending",
      }
  }
}

function Step({ label, state }: { label: string; state: StepState }) {
  const colorMap = {
    completed: "text-green-600",
    active: "text-blue-600",
    pending: "text-gray-300",
    rejected: "text-red-600",
  }

  const Icon =
    state === "rejected"
      ? XCircle
      : state === "completed"
      ? CheckCircle
      : Clock

  return (
    <div className="flex flex-col items-center flex-1 text-sm font-medium">
      <Icon className={`w-7 h-7 ${colorMap[state]}`} />
      <span className={`mt-2 ${state === "pending" ? "text-gray-400" : ""}`}>
        {label}
      </span>
    </div>
  )
}

export default function SubmissionActivityTimeline({
  status,
}: Props) {
  const steps = getStepStates(status)

  return (
    <div className="space-y-6 text-center">

      <h2 className="text-lg font-semibold mb-10">
        Aktivitas Terbaru
      </h2>

      <div className="flex items-center">
        <Step label="Upload" state={steps.upload} />

        <div className="flex-1 h-1 bg-gray-200 mx-4 rounded relative">
          <div
            className={`absolute inset-y-0 left-0 bg-green-500 rounded transition-all duration-500 ${
              steps.review !== "pending" ? "w-full" : "w-0"
            }`}
          />
        </div>

        <Step
          label={
            status === "REVIEWING"
              ? `Sedang direview`
              : "Review selesai"
          }
          state={steps.review}
        />

        <div className="flex-1 h-1 bg-gray-200 mx-4 rounded relative">
          <div
            className={`absolute inset-y-0 left-0 bg-green-500 rounded transition-all duration-500 ${
              steps.result === "completed" ? "w-full" : "w-0"
            }`}
          />
        </div>

        <Step label="Diterima" state={steps.result} />
      </div>
    </div>
  )
}