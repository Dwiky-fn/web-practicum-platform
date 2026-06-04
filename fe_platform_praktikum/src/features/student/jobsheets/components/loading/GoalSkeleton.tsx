export default function GoalCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
      
      {/* Title */}
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />

      {/* Paragraph */}
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-11/12" />
        <div className="h-3 bg-gray-200 rounded w-10/12" />
        <div className="h-3 bg-gray-200 rounded w-8/12" />
      </div>

    </div>
  );
}