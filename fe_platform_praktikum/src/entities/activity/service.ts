import { getActivityList } from "./api";
import type { Activity } from "./types";

export async function getRecentActivities(
  userId: string
): Promise<Activity[]> {
  const response = await getActivityList(userId);

  // optional: sort terbaru dulu
  return response.data.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}
