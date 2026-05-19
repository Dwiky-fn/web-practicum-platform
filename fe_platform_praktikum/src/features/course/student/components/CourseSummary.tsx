import type { Jobsheet } from "../../../../services/jobsheet/types";
import type { JobsheetSubmission } from "../../../../services/submission/types";

interface CourseSummarySidebarProps {
  jobsheets: Jobsheet[];
  submissions: JobsheetSubmission[];
}

function getStatusMap(submissions: JobsheetSubmission[]) {
  const map = new Map<string, JobsheetSubmission>();

  submissions.forEach((s) => {
    map.set(s.jobsheetId, s);
  });

  return map;
}

export default function CourseSummarySidebar({
  jobsheets,
  submissions
}: CourseSummarySidebarProps) {

  const statusMap = getStatusMap(submissions);

  const total = jobsheets.length;
  const totalExperiments = jobsheets.reduce((sum, jobsheet) => sum + jobsheet.experiments.length, 0);
  const totalExercises = jobsheets.reduce((sum, jobsheet) => sum + jobsheet.exercises.length, 0);

  const accepted = jobsheets.filter(j => 
    statusMap.get(j.id)?.status === "ACCEPTED"
  ).length;

  const revision = jobsheets.filter(j => 
    statusMap.get(j.id)?.status === "REVISION"
  ).length;

  const draft = jobsheets.filter(j => 
    (statusMap.get(j.id)?.status ?? "DRAFT") === "DRAFT"
  ).length;

  const overdue = jobsheets.filter(j => 
    statusMap.get(j.id)?.status === "OVERDUE"
  ).length;

  const progress =
    total > 0 ? Math.round((accepted / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 top-24">

      <h3 className="font-semibold mb-3 text-gray-800">
        Ringkasan
      </h3>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        <StatBox label="Jobsheet" value={total} />
        <StatBox label="Diterima" value={accepted} color="green" />
        <StatBox label="Percobaan" value={totalExperiments} />
        <StatBox label="Latihan" value={totalExercises} color="yellow" />

      </div>

      {/* Overdue */}
      {overdue > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {overdue} jobsheet melewati deadline
        </div>
      )}

      {(revision > 0 || draft > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="rounded-lg bg-red-50 p-3 text-red-600">
            {revision} perlu revisi
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-yellow-700">
            {draft} belum submit
          </div>
        </div>
      )}

      {/* Progress */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Progress Penyelesaian
        </p>

        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full bg-linear-to-r from-blue-500 to-blue-700 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {progress}% selesai
        </p>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color?: "green" | "red" | "yellow";
}

function StatBox({ label, value, color }: StatBoxProps) {

  const colorMap = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };

  return (
    <div
      className={`rounded-lg p-4 text-center ${
        color ? colorMap[color] : "bg-gray-50 text-gray-800"
      }`}
    >
      <p className="text-2xl font-semibold">
        {value}
      </p>
      <p className="text-xs mt-1">
        {label}
      </p>
    </div>
  );
}
