import { useNavigate } from "react-router-dom";
import { getDeadlineState } from "../../../../shared/utils/deadline";
import type { Jobsheet } from "../../../../services/jobsheet/types";
import type { JobsheetSubmission, SubmissionStatus } from "../../../../services/submission/types";

interface Props {
  jobsheet: Jobsheet;
  submission: JobsheetSubmission | null;
  courseId: string;
  jobsheetId: string;
}

export default function SidebarCard({
  jobsheet,
  submission,
  courseId,
  jobsheetId,
}: Props) {
  const navigate = useNavigate();

  const deadlineDate = new Date(jobsheet.deadline);
  const now = new Date();
  const deadlineState = getDeadlineState(jobsheet.deadline, now);
  const isOverdue = deadlineState.isOverdue;
  const status = submission?.status;
  const displayScore = submission?.review?.finalScore ?? submission?.score;

  function goTo() {
    navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/works`)
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
        return "Lanjutkan";
      case "REVISION":
        return "Kerjakan Revisi";
      case "SUBMITTED":
        return "Lihat Pekerjaan";
      case "ACCEPTED":
        return "Lihat Pekerjaan";
      case "REVIEWING":
        return "Lihat Pekerjaan";
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 mb-6">
      
      {/* STATUS */}
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Status</p>
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
            {deadlineDate.toLocaleDateString("id-ID")}
          </p>
        </div>

        {!isOverdue && (
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

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Percobaan untuk laporan</p>
          <div className="mt-2 space-y-1">
            {jobsheet.experiments.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={item.isReported} readOnly />
                <span>{item.title}</span>
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
                <span>{item.title}</span>
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
  );
}
