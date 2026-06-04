export default function HistoryCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
      
      {/* Title */}
      <div className="h-4 w-56 bg-gray-200 rounded mb-6" />

      {/* Table Header */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-12" />
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-10" />
            <div className="h-3 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>

    </div>
  );
}