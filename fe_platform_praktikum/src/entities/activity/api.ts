import { mockActivityList } from "./mocks";
import type { ActivityListResponse } from "./types";

export async function getActivityList(
  userId: string
): Promise<ActivityListResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: mockActivityList.data.filter(
          (activity) => activity.userId === userId
        ),
      });
    }, 400);
  });
}
