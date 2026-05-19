import { CalendarDays, Lock } from "lucide-react";
import type { Jobsheet } from "../../../../services/jobsheet/types";
import { getDeadlineState } from "../../../../shared/utils/deadline";
import type {
  JobsheetSubmission,
  SubmissionStatus,
} from "../../../../services/submission/types";

interface JobsheetCardProps {
  jobsheet: Jobsheet;
  submission?: JobsheetSubmission;
  onClick?: () => void;
}

function getStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "DRAFT":
      return "Belum Submit";
    case "SUBMITTED":
      return "Terkirim";
    case "REVIEWING":
      return "Sedang Direview";
    case "REVISION":
      return "Perlu Revisi";
    case "ACCEPTED":
      return "Diterima";
    case "OVERDUE":
      return "Terlambat";
    default:
      return status;
  }
}

function getStatusStyle(status: SubmissionStatus) {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-700";
    case "REVISION":
      return "bg-red-100 text-red-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700";
    case "REVIEWING":
      return "bg-blue-100 text-blue-700";
    case "DRAFT":
      return "bg-yellow-100 text-yellow-700";
    case "OVERDUE":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function hasMeaningfulAnalysis(analysis: unknown) {
  if (!analysis || typeof analysis !== "object") return false;

  return JSON.stringify(analysis).length > 30;
}

function getProgressTone(completed: number, total: number) {
  if (total === 0) return "bg-gray-50 text-gray-500 border-gray-200";
  if (completed === 0) return "bg-red-50 text-red-700 border-red-200";
  if (completed >= total) return "bg-green-50 text-green-700 border-green-200";

  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

export default function JobsheetCard({
  jobsheet,
  submission,
  onClick,
}: JobsheetCardProps) {
  const deadlineDate = new Date(jobsheet.deadline);
  const now = new Date();
  const deadlineState = getDeadlineState(jobsheet.deadline, now);

  const status: SubmissionStatus = submission?.status ?? "DRAFT";
  const score = submission?.score;

  const isUnpublished = jobsheet.status === "UNPUBLISHED";

  const isOverdue =
    status === "OVERDUE" ||
    (deadlineState.isOverdue && status === "DRAFT");

  const totalExperiments = jobsheet.experiments.length;
  const totalExercises = jobsheet.exercises.length;
  const completedExperiments = jobsheet.experiments.filter((experiment) => {
    const steps = submission?.report?.experiments?.[experiment.id]?.steps ?? [];

    return steps.some((step) => {
      const hasCode = Object.values(step.files ?? {}).some((code) => code.trim().length > 0);
      const hasOutput = step.output.trim().length > 0;
      const hasAnalysis = hasMeaningfulAnalysis(step.analysis);

      return hasCode && hasOutput && hasAnalysis;
    });
  }).length;
  const completedExercises = jobsheet.exercises.filter((exercise) => {
    const exerciseSubmission = submission?.report?.exercises?.[exercise.id];
    const hasCode = Object.values(exerciseSubmission?.files ?? {}).some((code) => code.trim().length > 0);
    const hasOutput = (exerciseSubmission?.output ?? "").trim().length > 0;
    const hasAnalysis = hasMeaningfulAnalysis(exerciseSubmission?.analysis);

    return hasCode && hasOutput && hasAnalysis;
  }).length;

  const isDisabled = isUnpublished;

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100
      ${isDisabled ? "opacity-60" : ""}`}
    >
      {/* TOP */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-800">
            {jobsheet.title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {jobsheet.description}
          </p>

          <div className="flex items-center gap-2 mt-3 text-xs">
            {isUnpublished ? (
              <>
                <Lock size={14} className="text-gray-400" />
                <span className="text-gray-400">
                  Belum dipublikasikan
                </span>
              </>
            ) : (
              <>
                <CalendarDays
                  size={14}
                  className={
                    isOverdue ? "text-red-500" : "text-gray-400"
                  }
                />
                <span
                  className={
                    isOverdue
                      ? "text-red-500 font-medium"
                      : "text-gray-400"
                  }
                >
                  Deadline:{" "}
                  {deadlineDate.toLocaleDateString("id-ID")} · {deadlineState.label}
                </span>
              </>
            )}
          </div>

        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
          {/* STATUS BADGE */}
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusStyle(
              status
            )}`}
          >
            {getStatusLabel(status)}
          </span>

          <div className="grid w-full grid-cols-2 gap-3 text-center sm:w-72">
            <ProgressBox
              label="Percobaan"
              completed={completedExperiments}
              total={totalExperiments}
            />
            <ProgressBox
              label="Latihan"
              completed={completedExercises}
              total={totalExercises}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM  */}
      <div className="mt-4 flex items-center justify-between">
        {/* NILAI */}
        {status === "ACCEPTED" && score ? (
          <p className="text-sm text-green-600 font-medium">
            Nilai: {score}
          </p>
        ) : (
          <div />
        )}

        {/* ACTION */}
        {!isDisabled && (
          <button
            onClick={onClick}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-700 transition cursor-pointer"
          >
            Detail
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressBox({
  label,
  completed,
  total,
}: {
  label: string;
  completed: number;
  total: number;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${getProgressTone(completed, total)}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold">{completed}/{total}</p>
    </div>
  );
}
