import { getNotificationList } from "./api";

export async function getNotifications(userId: string) {
  const response = await getNotificationList(userId);
  return response.data;
}
