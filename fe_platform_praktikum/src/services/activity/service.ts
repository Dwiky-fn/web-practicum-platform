import { apiFetch } from "../api"
import type { Activity } from "./types"

export async function getRecentActivities(userId: string): Promise<Activity[]> {
  const res = await apiFetch(`/users/${userId}/activities`)

  return res.data.activities.map((activity: {
    id: string
    student_id: string
    type: Activity["type"]
    title: string
    description: string
    created_at: string
  }) => ({
    id: activity.id,
    userId: activity.student_id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    createdAt: activity.created_at,
  }))
}
