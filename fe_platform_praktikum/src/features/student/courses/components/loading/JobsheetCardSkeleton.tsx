export default function JobsheetCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      {/* TOP */}
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-3">
          {/* Title */}
          <div className="h-4 bg-gray-200 rounded w-1/3" />

          {/* Description */}
          <div className="h-3 bg-gray-200 rounded w-2/3" />

          {/* Deadline */}
          <div className="h-3 bg-gray-200 rounded w-1/4 mt-2" />
        </div>

        {/* Badge */}
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* BOTTOM */}
      <div className="mt-6 flex items-center justify-between">
        {/* Score placeholder */}
        <div className="h-4 w-16 bg-gray-200 rounded" />

        {/* Button placeholder */}
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
