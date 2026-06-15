import { useNavigate } from "react-router-dom";
import { getDeadlineState } from "../../../../shared/utils/deadline";
import type { Jobsheet } from "../../../../services/jobsheet/types";
import type { JobsheetSubmission, SubmissionStatus } from "../../../../services/submission/types";

interface Props {
  jobsheet: Jobsheet;
  submission: JobsheetSubmission | null;
  courseId: string;
  jobsheetId: string;
  classId?: string;
}

export default function SidebarCard({
  jobsheet,
  submission,
  courseId,
  jobsheetId,
  classId,
}: Props) {
  const navigate = useNavigate();

  const now = new Date();
  const deadlineState = getDeadlineState(jobsheet.deadline, now);
  const isOverdue = deadlineState.isOverdue;
  const status = submission?.status;
  const displayScore = submission?.review?.finalScore ?? submission?.score;
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";

  function goTo() {
    if (status === "REVIEWING" || status === "ACCEPTED") {
      navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/review${query}`)
      return
    }

    if (status === "SUBMITTED") {
      navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/preview${query}`)
      return
    }

    navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/works${query}`)
  }

  function getStatusStyle(status?: SubmissionStatus) {
    if (!status) return "text-gray-600";

    switch (status) {
      case "ACCEPTED":
        return "text-green-600";
      case "SUBMITTED":
      case "REVIEWING":
        return "text-green-600";
      case "REVISION":
        return "text-red-600";
      case "DRAFT":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  }

  function getActionLabel(status?: SubmissionStatus) {
    if (!status) return "Mulai Kerjakan";

    switch (status) {
      case "DRAFT":
        return "Lanjutkan Pengerjaan";
      case "REVISION":
        return "Lanjutkan Revisi";
      case "SUBMITTED":
        return "Lihat Submission";
      case "ACCEPTED":
        return "Lihat Review";
      case "REVIEWING":
        return "Lihat Review";
      default:
        return "Mulai Kerjakan";
    }
  }

  function getStatusLabel(status?: SubmissionStatus) {
    if (!status) return "Belum Dikerjakan";

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

  function getLatestReviewComment() {
    const comments = submission?.review?.comments ?? [];
    const latestComment = comments[comments.length - 1]?.comment?.trim();

    return submission?.review?.lecturerFeedback?.trim() || latestComment || "";
  }

  const latestReviewComment = getLatestReviewComment();

  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="space-y-6">
      
      {/* STATUS */}
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Status Pengerjaan</p>
        <span className={`text-sm font-medium ${getStatusStyle(status)}`}>
          {getStatusLabel(status)}
        </span>
      </div>

      {/* DEADLINE */}
      <div>
        <div className="flex justify-between">
          <p className="text-sm text-gray-500">Deadline</p>
          <p
            className={`text-sm font-medium ${
              isOverdue
                ? "text-red-600"
                : deadlineState.label === "Deadline hari ini"
                ? "text-yellow-600"
                : "text-gray-800"
            }`}
          >
            {deadlineState.date
              ? deadlineState.date.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Belum diatur"}
          </p>
        </div>

        {!isOverdue && deadlineState.date && (
          <p className="text-xs text-gray-400 text-right mt-1">
            {deadlineState.label}
          </p>
        )}
      </div>

      {/* NILAI */}
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Nilai</p>
        <p className="text-sm font-semibold text-green-600">
          {displayScore ?? "-"}
        </p>
      </div>

      {submission && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700">Informasi Submission</p>
          <p className="mt-1">
            Update terakhir:{" "}
            {submission.updatedAt
              ? new Date(submission.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700">Percobaan untuk laporan</p>
          <div className="mt-2 space-y-1">
            {jobsheet.experiments.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={item.isReported} readOnly />
                <span>{item.title} ({item.rubric ?? 0}%)</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Latihan untuk laporan</p>
          <div className="mt-2 space-y-1">
            {jobsheet.exercises.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={item.isReported} readOnly />
                <span>{item.title} ({item.rubric ?? 0}%)</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {latestReviewComment && status === "REVISION" && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">
            Catatan revisi
          </p>
          <p className="mt-1 text-sm text-red-700">
            {latestReviewComment}
          </p>
        </div>
      )}

      {/* ACTION */}
      <button
        disabled={isOverdue && (!status || status === "DRAFT")}
        onClick={goTo}
        className={`w-full py-2 rounded-lg transition ${
          isOverdue && (!status || status === "DRAFT")
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {getActionLabel(status)}
      </button>
      </div>
    </div>
  );
}
