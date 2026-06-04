export default function SummaryCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
      <div className="space-y-3">
        {/* Title */}
        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />

        {/* Value */}
        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
      </div>

      {/* Icon placeholder */}
      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
    </div>
  )
}
