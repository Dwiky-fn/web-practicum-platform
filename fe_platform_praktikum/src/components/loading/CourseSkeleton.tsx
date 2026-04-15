export default function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">

      {/* Title */}
      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />

      {/* Subtitle */}
      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div className="h-2 bg-gray-300 w-2/3 animate-pulse" />
      </div>

      {/* Progress text */}
      <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />

    </div>
  )
}
