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

  function goTo() {
    navigate(`/courses/${courseId}/jobsheets/${jobsheetId}/works`)
  }

  function getStatusStyle(status?: SubmissionStatus) {
    if (!status) return "text-gray-600";

    switch (status) {
      case "ACCEPTED":
        return "text-green-600";
      case "REVISION":
        return "text-red-600";
      case "SUBMITTED":
        return "text-blue-600";
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
        return "Mulai Belajar";
      case "REVISION":
        return "Belajar Lagi";
      case "SUBMITTED":
        return "Belajar Lagi";
      case "ACCEPTED":
        return "Belajar Lagi";
      case "REVIEWING":
        return "Belajar Lagi";
      default:
        return "Mulai Kerjakan";
    }
  }

  function getStatusLabel(status?: SubmissionStatus) {
    if (!status) return "Belum Dikerjakan";

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
          {submission?.score ?? 0}
        </p>
      </div>

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
