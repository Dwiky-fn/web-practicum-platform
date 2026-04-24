import type { Jobsheet } from "../../services/jobsheet/types";
import { getDashboardSummaryData } from "./api";
import type { DashboardSummary } from "./types";

export async function getDashboardSummary(
  userId: string,
  jobsheets: Jobsheet[]
): Promise<DashboardSummary> {
  return await getDashboardSummaryData(userId, jobsheets);
}