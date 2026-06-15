export default function SidebarCardSkeleton() {
  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 animate-pulse">
      
      {/* STATUS */}
      <div className="flex justify-between">
        <div className="h-3 w-14 bg-gray-200 rounded" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>

      {/* DEADLINE */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-2 w-20 bg-gray-200 rounded ml-auto" />
      </div>

      {/* NILAI */}
      <div className="flex justify-between">
        <div className="h-3 w-12 bg-gray-200 rounded" />
        <div className="h-3 w-8 bg-gray-200 rounded" />
      </div>

      {/* BUTTON */}
      <div className="h-9 w-full bg-gray-200 rounded-lg" />

    </div>
  );
}
