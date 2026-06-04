export default function CourseSummarySidebarSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">

      {/* Title */}
      <div className="h-5 w-28 bg-gray-200 rounded mb-6" />

      {/* Statistik Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">

        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-50 rounded-lg p-4 text-center space-y-2"
          >
            <div className="h-6 w-10 bg-gray-200 rounded mx-auto" />
            <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
          </div>
        ))}

      </div>

      {/* Progress Section */}
      <div className="space-y-3">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="w-full h-2 bg-gray-200 rounded-full" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>

    </div>
  );
}
