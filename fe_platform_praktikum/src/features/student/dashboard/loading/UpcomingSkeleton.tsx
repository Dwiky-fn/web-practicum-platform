export default function UpcomingTaskSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y overflow-hidden">
      {Array.from({ length: 1 }).map((_, i) => (
        <div
          key={i}
          className="p-6 flex justify-between items-center"
        >
          <div className="space-y-2 w-2/3">
            {/* Title */}
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            {/* Subtitle */}
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>

          {/* Deadline */}
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
