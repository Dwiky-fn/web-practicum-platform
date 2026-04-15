import { CalendarDays, Lock } from "lucide-react";
import type { Jobsheet } from "../../../../entities/jobsheet/types";

interface JobsheetCardProps {
  jobsheet: Jobsheet;
  onClick?: () => void;
}

function getStatusStyle(status: Jobsheet["status"]) {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-700";
    case "REVISION":
      return "bg-red-100 text-red-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700";
    case "NOT_SUBMITTED":
      return "bg-yellow-100 text-yellow-700";
    case "OVERDUE":
      return "bg-gray-200 text-gray-600";
    case "UNPUBLISHED":
      return "bg-gray-200 text-gray-500";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function JobsheetCard({
  jobsheet,
  onClick,
}: JobsheetCardProps) {

  const deadlineDate = new Date(jobsheet.deadline);
  const now = new Date();

  const isUnpublished = jobsheet.status === "UNPUBLISHED";
  const isOverdue =
    jobsheet.status === "OVERDUE" ||
    (deadlineDate < now && jobsheet.status === "NOT_SUBMITTED");

  const isDisabled = isUnpublished || isOverdue;

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100
      ${isDisabled ? "opacity-60" : ""}`}
    >

      {/* TOP */}
      <div className="flex justify-between items-start">

        <div className="flex-1">

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
                  className={isOverdue ? "text-red-500" : "text-gray-400"}
                />
                <span
                  className={isOverdue ? "text-red-500 font-medium" : "text-gray-400"}
                >
                  Deadline: {deadlineDate.toLocaleDateString()}
                </span>
              </>
            )}
          </div>

        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusStyle(
            jobsheet.status
          )}`}
        >
          {jobsheet.status.replace("_", " ")}
        </span>
      </div>

      {/* BOTTOM */}
      <div className="mt-4 flex items-center justify-between">

        {jobsheet.status === "ACCEPTED" && jobsheet.score ? (
          <p className="text-sm text-green-600 font-medium">
            Nilai: {jobsheet.score}
          </p>
        ) : (
          <div />
        )}

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
