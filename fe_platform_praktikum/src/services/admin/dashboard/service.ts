import { apiFetch } from "../../api"
import type { AdminDashboardSummary } from "../types"

export const getAdminDashboard = async (): Promise<AdminDashboardSummary> => {
  const res = await apiFetch("/admin/dashboard")
  return res.data.dashboard
}
