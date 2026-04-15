export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
}

export interface NotificationListResponse {
  data: Notification[];
}
