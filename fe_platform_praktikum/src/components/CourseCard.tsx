import type { Course } from "../services/course/types";

interface CourseCardProps {
  course: Course;
  jobsheetCount?: number;
  onClick?: () => void;
  hideProgress?: boolean;
}

export default function CourseCard({
  course,
  jobsheetCount,
  onClick,
  hideProgress = false,
}: CourseCardProps) {
  const progress = course.progress ?? 0;
  const totalJobsheets = jobsheetCount ?? course.jobsheetCount ?? course.jobsheet_count ?? 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md cursor-pointer"
    >
      <div>
        <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
          {course.name}
        </h3>

        <p className="mt-1.5 text-xs text-gray-500 font-medium">
          {course.code} &bull; {course.lecturer ?? "Dosen belum ditentukan"}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100/80">
        {!hideProgress && (
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <p className="text-xs font-semibold text-gray-600 flex items-center justify-between">
          <span>{totalJobsheets} jobsheet</span>
          {!hideProgress && <span className="text-blue-700 font-bold">Progress: {progress}%</span>}
        </p>
      </div>
    </div>
  )
}
