import { useNavigate } from "react-router-dom";
import type { Jobsheet } from "../../../../entities/jobsheet/types";

interface Props {
  jobsheet: Jobsheet;
  courseId: string;
  jobsheetId: string;
}

export default function SidebarCard({
  jobsheet,
  courseId,
  jobsheetId,
}: Props) {
  const navigate = useNavigate();

  const deadlineDate = new Date(jobsheet.deadline);
  const now = new Date();
  const isOverdue = deadlineDate < now;

  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const firstContent =
    jobsheet.theory[0]?.id
    ?? jobsheet.experiments[0]?.id
    ?? jobsheet.exercises[0]?.id;

  function goTo() {
    if (firstContent) {
      navigate(
        `/courses/${courseId}/jobsheets/${jobsheetId}/works/theory/${firstContent}`
      )
    }
  }

  function getStatusStyle(status: Jobsheet["status"]) {
    switch (status) {
      case "ACCEPTED":
        return "text-green-600";
      case "REVISION":
        return "text-red-600";
      case "SUBMITTED":
        return "text-blue-600";
      case "NOT_SUBMITTED":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  }

  function getActionLabel(status: Jobsheet["status"]) {
    switch (status) {
      case "NOT_SUBMITTED":
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 mb-6">
      
      {/* STATUS */}
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Status</p>
        <span className={`text-sm font-medium ${getStatusStyle(jobsheet.status)}`}>
          {jobsheet.status.replace("_", " ")}
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
                : daysLeft <= 3
                ? "text-yellow-600"
                : "text-gray-800"
            }`}
          >
            {deadlineDate.toLocaleDateString()}
          </p>
        </div>

        {!isOverdue && daysLeft > 0 && (
          <p className="text-xs text-gray-400 text-right mt-1">
            {daysLeft} hari lagi
          </p>
        )}
      </div>

      {/* NILAI */}
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Nilai</p>
        <p className="text-sm font-semibold text-green-600">
          {jobsheet.score ?? 0}
        </p>
      </div>

      {/* ACTION */}
      <button
        disabled={isOverdue && jobsheet.status === "NOT_SUBMITTED"}
        onClick={goTo}
        className={`w-full py-2 rounded-lg transition ${
          isOverdue && jobsheet.status === "NOT_SUBMITTED"
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {getActionLabel(jobsheet.status)}
      </button>
    </div>
  );
}
