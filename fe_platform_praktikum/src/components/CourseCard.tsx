import type { Course } from "../services/course/types";

interface CourseCardProps {
  course: Course;
  jobsheetCount?: number;
  onClick?: () => void;
}

export default function CourseCard({
  course,
  jobsheetCount,
  onClick,
}: CourseCardProps) {
  const progress = course.progress ?? 0;
  const totalJobsheets = jobsheetCount ?? course.jobsheetCount ?? course.jobsheet_count ?? 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md active:shadow-md transition cursor-pointer border border-gray-100"
    >
      <h3 className="font-semibold text-gray-800 mb-1">
        {course.name}
      </h3>

      <p className="text-sm text-gray-500 mb-3">
        {course.code} - {course.lecturer ?? "Dosen belum ditentukan"}
      </p>

      {/* Progress */}
      <div className=" w-full bg-gray-200 h-2 rounded-full mb-3">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">
        {totalJobsheets} jobsheet · Progress: {progress}%
      </p>

    </div>
  )
}
