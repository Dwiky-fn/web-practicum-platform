import { mockNotificationList } from "./mocks";

export async function getNotificationList(userId: string) {
  return {
    data: mockNotificationList.data.filter(
      (notif) => notif.userId === userId
    ),
  };
}
