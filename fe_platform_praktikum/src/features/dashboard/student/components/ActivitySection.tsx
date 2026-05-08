import { CheckCircle, BookOpen, ClipboardList } from "lucide-react";
import type { Activity, ActivityType } from "../../../../services/activity/types";
import ActivitySectionSkeleton from "../loading/ActivitySkeleton";

interface ActivitySectionProps {
  activities: Activity[];
  loading?: boolean;
}

function getIcon(type: ActivityType) {
  switch (type) {
    case "TASK_SUBMITTED":
      return <CheckCircle size={18} className="text-green-500 translate-y-5" />;
    case "GRADE_RELEASED":
      return <BookOpen size={18} className="text-blue-500 translate-y-5" />;
    case "TASK_CREATED":
      return <ClipboardList size={18} className="text-purple-500 translate-y-5" />;
    default:
      return null;
  }
}

export default function ActivitySection({
  activities,
  loading = false,
}: ActivitySectionProps) {

  if (loading) {
    return <ActivitySectionSkeleton />
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-gray-500">
        Belum ada aktivitas hari ini.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y overflow-hidden">
      {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-6 hover:bg-gray-50 active:bg-gray-50 transition"
          >
            <div className="flex items-start gap-3">
              {getIcon(activity.type)}

              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
