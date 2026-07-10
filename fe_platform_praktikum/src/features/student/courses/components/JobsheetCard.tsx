import { CalendarDays, Lock } from "lucide-react";
import type { Jobsheet } from "../../../../services/jobsheet/types";
import { getDeadlineState } from "../../../../shared/utils/deadline";
import type {
  JobsheetSubmission,
  SubmissionStatus,
} from "../../../../services/submission/types";
import { formatAcademicDate } from "../../../../shared/utils/formatAcademicDateTime";
import { formatScore } from "../../../../shared/utils/formatScore";

interface JobsheetCardProps {
  jobsheet: Jobsheet;
  submission?: JobsheetSubmission;
  onClick?: () => void;
}

function getStatusLabel(status?: SubmissionStatus) {
  if (!status) return "Belum dikerjakan";

  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Selesai";
    case "REVIEWING":
      return "Selesai";
    case "REVISION":
      return "Perlu Revisi";
    case "ACCEPTED":
      return "Selesai";
    case "OVERDUE":
      return "Terlambat";
    default:
      return status;
  }
}

function getStatusStyle(status?: SubmissionStatus) {
  if (!status) return "bg-gray-100 text-gray-600";

  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-700";
    case "SUBMITTED":
    case "REVIEWING":
      return "bg-green-100 text-green-700";
    case "REVISION":
      return "bg-red-100 text-red-700";
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



function getLatestReviewComment(submission?: JobsheetSubmission) {
  const comments = submission?.review?.comments ?? [];
  const latestComment = comments[comments.length - 1]?.comment?.trim();

  return submission?.review?.lecturerFeedback?.trim() || latestComment || "";
}

export default function JobsheetCard({
  jobsheet,
  submission,
  onClick,
}: JobsheetCardProps) {
  const now = new Date();
  const deadlineState = getDeadlineState(jobsheet.deadline, now);

  const status = submission?.status;
  const score = submission?.review?.finalScore ?? submission?.score;

  const isUnpublished = jobsheet.status === "UNPUBLISHED" || jobsheet.status === "DRAFT";
  const isLockedBySequence = jobsheet.access?.accessMode === "locked_sequence";

  const isOverdue =
    status === "OVERDUE" ||
    (deadlineState.isOverdue && (!status || status === "DRAFT"));
  const displayStatus: SubmissionStatus | undefined = isOverdue ? "OVERDUE" : status;

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
  const totalWorkItems = totalExperiments + totalExercises;
  const completedWorkItems = completedExperiments + completedExercises;
  const progressPercent = totalWorkItems > 0
    ? Math.round((completedWorkItems / totalWorkItems) * 100)
    : 0;
  const latestReviewComment = getLatestReviewComment(submission);

  const isDisabled = isUnpublished || isLockedBySequence;

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
            {isUnpublished || isLockedBySequence ? (
              <>
                <Lock size={14} className="text-gray-400" />
                <span className="text-gray-400">
                  {isLockedBySequence
                    ? jobsheet.access?.message || "Selesaikan jobsheet sebelumnya terlebih dahulu."
                    : "Jobsheet belum dipublish."}
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
                  {formatAcademicDate(jobsheet.deadline)} - {deadlineState.label}
                </span>
              </>
            )}
          </div>

          {!isUnpublished && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Progress jobsheet</span>
                <span className="font-medium text-gray-700">
                  {completedWorkItems}/{totalWorkItems} bagian
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {latestReviewComment && status === "REVISION" && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-red-700">
                Catatan revisi
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-red-700">
                {latestReviewComment}
              </p>
            </div>
          )}

        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
          {/* STATUS BADGE */}
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusStyle(
              displayStatus
            )}`}
          >
            {getStatusLabel(displayStatus)}
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
        {(status === "ACCEPTED" || status === "REVISION") && score != null ? (
          <p className="text-sm text-green-600 font-medium">
            Nilai: {formatScore(score)}
          </p>
        ) : submission?.updatedAt ? (
          <p className="text-sm text-gray-500">
            Update terakhir: {formatAcademicDate(submission.updatedAt)}
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
            Lihat Detail
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
