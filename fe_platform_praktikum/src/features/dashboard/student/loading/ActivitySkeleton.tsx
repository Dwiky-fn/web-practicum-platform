export default function ActivitySectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y overflow-hidden">
      {Array.from({ length: 1 }).map((_, i) => (
        <div key={i} className="p-6">
          <div className="flex items-start gap-3">

            {/* Icon Placeholder */}
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mt-1 translate-y-6" />

            <div className="flex-1 space-y-2">

              {/* Title */}
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />

              {/* Description */}
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />

              {/* Date */}
              <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse mt-2" />

            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
