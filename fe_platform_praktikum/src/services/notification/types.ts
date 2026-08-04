export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  target_url?: string
  targetUrl?: string
  readAtTimestamp?: number | null
}
