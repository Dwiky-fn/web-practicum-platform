import type { Course } from "../entities/course/types";

interface CourseCardProps {
  course: Course;
  onClick?: () => void;
}

export default function CourseCard({
  course,
  onClick,
}: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md active:shadow-md transition cursor-pointer border border-gray-100"
    >
      <h3 className="font-semibold text-gray-800 mb-1">
        {course.name}
      </h3>

      <p className="text-sm text-gray-500 mb-3">
        {course.code} - { course.lecturer}
      </p>

      {/* Progress */}
      <div className=" w-full bg-gray-200 h-2 rounded-full mb-3">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${course.progress}`}}
        />
      </div>

      <p className="text-xs text-gray-500">
        Progress: {course.progress}%
      </p>

    </div>
  )
}